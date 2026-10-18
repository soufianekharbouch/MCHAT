import ShopCatalog from "../../components/shop/ShopCatalog";

/*
 * Hidden route (not a tab): the catalog for a signed in customer.
 * Visitors see the same catalog directly on the Home tab (index).
 */
export default function ShopScreen() {
  return <ShopCatalog />;
}