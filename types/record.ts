export interface Record {
  id: number; // Or string, depending on API response
  title: string;
  price: number;
  quantity: number;
  condition?: string;
  cover_image?: string;
  artist?: string;
  format?: string;
  label?: string;
  // Add any other fields returned by the external API's /api/records endpoint that the frontend needs
} 