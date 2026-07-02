import type { TestimonialMeta } from "@/types/testimonial";

// Non-linguistic display data. The quote/name/role text lives in
// messages/*/home.json (Testimonials.items) so it can be translated,
// matched to this array positionally.
export const testimonialsMeta: TestimonialMeta[] = [
  { avatarInitials: "AN", rating: 5 },
  { avatarInitials: "MA", rating: 5 },
  { avatarInitials: "NS", rating: 4.9 },
];
