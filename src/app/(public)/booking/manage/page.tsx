import { BookingManagement } from "@/features/booking/booking-management";

export const metadata = {
  title: "Manage your booking",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() { return <BookingManagement />; }
