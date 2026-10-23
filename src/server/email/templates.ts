import type { InquiryInput } from "@/features/inquiries/validation";
import type { EmailConfig } from "./config";

export type EmailPayload = { from: string; to: string[]; subject: string; text: string; reply_to: string };
export function inquiryEmails(data: InquiryInput, config: EmailConfig) {
  // Plain text avoids HTML injection. The visitor receipt never reflects untrusted
  // names, links or message contents into an arbitrary recipient's mailbox.
  return [
    {
      id: `inquiry-owner/${data.id}`, kind: "owner",
      payload: {
        from: config.from, to: [config.owner], reply_to: data.email,
        subject: "New GriffamDev project inquiry",
        text: `A new project inquiry is saved in your private inbox.\n\nReview it at ${config.origin}/admin/inquiries\n\nSign in with your owner account to read the message.`,
      },
    },
    {
      id: `inquiry-receipt/${data.id}`, kind: "receipt",
      payload: {
        from: config.from, to: [data.email], reply_to: config.owner,
        subject: "GriffamDev received your project inquiry",
        text: "Your project inquiry has been saved. Enoch Griffith can review it and reply to this email address.\n\nThis is a receipt, not an appointment confirmation. No call has been booked.\n\nIf you did not submit an inquiry, you can ignore this email.\n\nEnoch Griffith\nFull Stack Software Engineer · GriffamDev",
      },
    },
  ] satisfies { id: string; kind: string; payload: EmailPayload }[];
}
