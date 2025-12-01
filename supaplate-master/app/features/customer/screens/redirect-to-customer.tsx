/**
 * 루트(/) → /customer 리다이렉트
 */
import { redirect } from "react-router";

export function loader() {
  return redirect("/customer");
}

export default function RedirectToCustomer() {
  return null;
}


