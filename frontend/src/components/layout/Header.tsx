import { getHome } from "@/lib/home";
import HeaderClient from "./HeaderClient";

/** Server wrapper: loads mega-menu data (cached) and renders the interactive header. */
export default async function Header() {
  const home = await getHome();
  return <HeaderClient menu={home} />;
}
