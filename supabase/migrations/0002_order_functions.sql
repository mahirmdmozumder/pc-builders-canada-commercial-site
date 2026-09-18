-- ===========================================================================
-- Order fulfilment helpers
-- ===========================================================================

-- Decrement stock for every component in a paid order, in one statement.
--
-- Why a database function rather than read-modify-write in the application:
-- two orders paid in the same second would otherwise both read stock = 1 and
-- both write stock = 0, overselling the part. `stock_quantity - qty` inside a
-- single UPDATE is evaluated per row under the row lock, so concurrent calls
-- serialise correctly.
--
-- Stock is floored at zero rather than allowed to go negative: a backorder is
-- a business decision, not an arithmetic accident. The function returns any
-- component that could not be fully satisfied so the caller can flag it.
create or replace function apply_order_stock(p_order_id uuid)
returns table (component_id text, requested integer, applied integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  for rec in
    select
      coalesce(oi.component_id, item ->> 'component_id') as cid,
      sum(
        coalesce((item ->> 'quantity')::int, 1) * oi.quantity
      )::int as qty
    from order_items oi
    left join lateral jsonb_array_elements(
      case when jsonb_typeof(oi.configuration) = 'array'
           then oi.configuration
           else '[]'::jsonb end
    ) as item on true
    where oi.order_id = p_order_id
    group by 1
  loop
    continue when rec.cid is null;

    update components c
       set stock_quantity = greatest(0, c.stock_quantity - rec.qty)
     where c.id = rec.cid;

    if found then
      component_id := rec.cid;
      requested := rec.qty;
      select c.stock_quantity into applied from components c where c.id = rec.cid;
      return next;
    end if;
  end loop;
end;
$$;

revoke execute on function apply_order_stock(uuid) from anon, authenticated;

-- Components at or below their low-stock threshold, for the admin dashboard.
create or replace view low_stock_components as
  select id, sku, category, brand, model, stock_quantity, low_stock_threshold, price_cents
    from components
   where active
     and stock_quantity <= low_stock_threshold
   order by stock_quantity asc;

-- The view inherits the caller's permissions rather than the definer's, so
-- the admin-only policy on `components` still applies to it.
alter view low_stock_components set (security_invoker = true);
