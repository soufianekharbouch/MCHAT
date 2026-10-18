import WhatsAppAuthForm from "../components/shop/WhatsAppAuthForm";

/*
 * Sign in with a WhatsApp code only.
 * The old password screen is kept in app/login-password.tsx (not used).
 */
export default function LoginScreen() {
  return <WhatsAppAuthForm mode="login" />;
}
