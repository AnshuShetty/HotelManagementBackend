export function getBookingStatus(booking, now = new Date()) {
  if (booking.status === "CANCELLED") {
    return "CANCELLED";
  }

  if (now < booking.checkIn) {
    return "CONFIRMED";
  }

  if (now >= booking.checkIn && now < booking.checkOut) {
    return "ACTIVE";
  }

  // now >= checkout time (11:00 AM)
  return "COMPLETED";
}
