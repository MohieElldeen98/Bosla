import type { TestimonialMeta } from "@/types/testimonial";

// Non-linguistic display data. The quote/name/role text lives in
// messages/*/home.json (Testimonials.items) so it can be translated,
// matched to this array positionally.
export const testimonialsMeta: TestimonialMeta[] = [
  { avatarInitials: "AO", rating: 5 },
  { avatarInitials: "LF", rating: 5 },
  { avatarInitials: "NA", rating: 4.9 },
];
