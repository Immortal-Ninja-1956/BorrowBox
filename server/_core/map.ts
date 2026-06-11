// Server-side maps helper stub - not used in BorrowBox core flow.
export async function geocode(_address: string) {
  throw new Error(
    "Geocoding not configured. Set GOOGLE_MAPS_API_KEY if needed."
  );
}
