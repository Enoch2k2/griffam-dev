export const inquiryServices = [
  "Web application",
  "Integration or custom tool",
  "AI feature",
  "Not sure yet",
] as const;
export type InquiryInput = {
  id: string;
  name: string;
  email: string;
  service: string;
  message: string;
};
export type InquiryErrors = Partial<Record<keyof InquiryInput, string>>;
export function validateInquiry(value: unknown):
  | { ok: true; data: InquiryInput }
  | { ok: false; errors: InquiryErrors } {
  const fields = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const string = (key: string) => typeof fields[key] === "string" ? fields[key].trim() : "";
  const data = {
    id: string("id"), name: string("name"), email: string("email").toLowerCase(),
    service: string("service"), message: string("message"),
  };
  const errors: InquiryErrors = {};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id))
    errors.id = "Refresh the page and try again.";
  if (data.name.length < 2 || data.name.length > 100) errors.name = "Enter a name between 2 and 100 characters.";
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Enter a valid email address.";
  if (!inquiryServices.some(service => service === data.service)) errors.service = "Choose a project type.";
  if (data.message.length < 20 || data.message.length > 4000) errors.message = "Tell me about your project in 20–4,000 characters.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
