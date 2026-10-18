import WhatsAppAuthForm from "../components/shop/WhatsAppAuthForm";

/*
 * Sign up: full name + phone + WhatsApp code.
 * The old full form (password, address...) is kept in app/register-full.tsx (not used).
 */
export default function RegisterScreen() {
  return <WhatsAppAuthForm mode="signup" />;
}
