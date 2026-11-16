import { describe, expect, it } from "vitest";
import {
  buildCatalogQuery,
  formatPriceLabel,
  formatVnd,
  getInitials,
  parseCatalogQuery,
  toggleValue,
} from "./catalog";

describe("catalog query", () => {
  it("parses and normalizes filters from the URL", () => {
    expect(parseCatalogQuery("?page=2&search=%20ve%20&chu_de=A%7CB%7CA&cap_do=CO_BAN,XX&sap_xep=ten")).toEqual({
      page: 2,
      search: "ve",
      topics: ["A", "B"],
      levels: ["CO_BAN"],
      sort: "ten",
    });
  });

  it("falls back to defaults for invalid values", () => {
    expect(parseCatalogQuery("?page=-1&sap_xep=bad")).toEqual({
      page: 1,
      search: "",
      topics: [],
      levels: [],
      sort: "moi_nhat",
    });
  });

  it("builds a canonical query string", () => {
    expect(buildCatalogQuery({ page: 1, search: "", topics: [], levels: [], sort: "moi_nhat" })).toBe("");
    expect(buildCatalogQuery({ page: 3, search: "ve", topics: ["A", "B"], levels: ["CO_BAN"], sort: "pho_bien" }))
      .toBe("page=3&search=ve&chu_de=A%7CB&cap_do=CO_BAN&sap_xep=pho_bien");
  });

  it("toggles values", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("catalog formatting", () => {
  it("formats prices from the database value only", () => {
    expect(formatPriceLabel(null)).toBeNull();
    expect(formatPriceLabel(0)).toBe("Miễn phí");
    expect(formatVnd(399000)).toMatch(/^₫399[.\s]000$/);
  });

  it("builds initials", () => {
    expect(getInitials("Minh Anh")).toBe("MA");
    expect(getInitials(null)).toBe("?");
  });
});
