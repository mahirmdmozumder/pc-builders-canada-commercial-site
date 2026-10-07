import { describe, expect, it } from 'vitest';
import { isCompanyPath, isShopPath } from '@/components/layout/site-header';

/**
 * Which paths light up the Shop item in the bar.
 *
 * The Shop disclosure replaced a plain link, and the reason it had to exist is
 * recorded in site-header.tsx: six category pages and four company pages were
 * reachable only from the footer on any viewport from 1280px up, because the
 * section list rendered solely inside the mobile drawer.
 */
describe('isShopPath', () => {
  it('marks the shop itself', () => {
    expect(isShopPath('/shop')).toBe(true);
  });

  it('marks every category in the menu', () => {
    for (const path of [
      '/gaming-pcs',
      '/workstations',
      '/networking',
      '/nas',
      '/mini-pcs',
      '/refurbished',
    ]) {
      expect(isShopPath(path)).toBe(true);
    }
  });

  // The case a hand-written check forgets: a product page sits a level deeper
  // than the category, and somebody reading a spec sheet should still see where
  // in the site they are.
  it('marks a detail page under a category', () => {
    expect(isShopPath('/workstations/creator-workstation')).toBe(true);
    expect(isShopPath('/gaming-pcs/anything')).toBe(true);
    expect(isShopPath('/shop/whatever')).toBe(true);
  });

  // The case a naive startsWith gets WRONG. These are not shop paths and must
  // not mark the item, however similar the first characters are.
  it('does not match a path that merely shares a prefix', () => {
    for (const path of ['/shopping', '/nascar', '/networkings', '/workstationsomething']) {
      expect(isShopPath(path)).toBe(false);
    }
  });

  it('does not mark the other top-level destinations', () => {
    for (const path of ['/', '/build', '/services', '/pos', '/cart', '/about', '/contact']) {
      expect(isShopPath(path)).toBe(false);
    }
  });
});

describe('isCompanyPath', () => {
  /**
   * Portfolio, About, Contact and FAQ were reachable on a desktop only from the
   * footer. Portfolio is the one that made it matter: photographs of machines
   * actually built and delivered are the strongest thing on this site for
   * somebody deciding whether to trust it, and it sat below the fold on every
   * page.
   */
  it('marks every company page', () => {
    for (const path of ['/portfolio', '/about', '/contact', '/faq']) {
      expect(isCompanyPath(path)).toBe(true);
    }
  });

  it('marks a portfolio build page one level deeper', () => {
    expect(isCompanyPath('/portfolio/some-build')).toBe(true);
  });

  // /about is the most exposed of the four to a bare startsWith, because
  // "/aboutus" and "/about-us" are both plausible routes somebody might add.
  it('does not match a path that merely shares a prefix', () => {
    for (const path of ['/aboutus', '/about-us', '/contacts', '/faqs', '/portfolios']) {
      expect(isCompanyPath(path)).toBe(false);
    }
  });

  it('does not overlap with the shop pages', () => {
    for (const path of ['/shop', '/workstations', '/gaming-pcs', '/nas']) {
      expect(isCompanyPath(path)).toBe(false);
    }
    for (const path of ['/portfolio', '/about', '/contact', '/faq']) {
      expect(isShopPath(path)).toBe(false);
    }
  });

  it('does not mark the top-level destinations', () => {
    for (const path of ['/', '/build', '/services', '/pos', '/cart']) {
      expect(isCompanyPath(path)).toBe(false);
    }
  });
});
