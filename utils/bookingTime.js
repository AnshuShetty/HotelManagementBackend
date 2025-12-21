export function applyHotelTimes(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(14, 0, 0, 0); // 2:00 PM check-in

  const checkOut = new Date(checkOutDate);
  checkOut.setHours(11, 0, 0, 0); // 11:00 AM checkout

  return { checkIn, checkOut };
}
