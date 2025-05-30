export interface CourtVenue {
  id: string;
  name: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  distance?: number;
}
