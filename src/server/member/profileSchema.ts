import "server-only";

import { z } from "zod";

const profileFields = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  calendar: z.enum(["solar", "lunar"]),
  isLeapMonth: z.boolean(),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["male", "female", "unspecified"]),
  dayBoundaryRule: z.enum(["zi23", "midnight"]),
  placeLabel: z.string().trim().min(1).max(100),
  placeLabelEn: z.string().trim().max(100),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timeZone: z.string().trim().min(1).max(64),
}).strict();

export const memberProfileSchema = profileFields.superRefine((profile, context) => {
  const daysInMonth = new Date(Date.UTC(profile.year, profile.month, 0)).getUTCDate();
  if (profile.day > daysInMonth) {
    context.addIssue({ code: "custom", path: ["day"], message: "Invalid calendar day" });
  }
  if (profile.calendar === "solar" && profile.isLeapMonth) {
    context.addIssue({ code: "custom", path: ["isLeapMonth"], message: "Solar dates cannot be leap months" });
  }
  if ((profile.hour === null) !== (profile.minute === null)) {
    context.addIssue({ code: "custom", path: ["minute"], message: "Hour and minute must both be known or unknown" });
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: profile.timeZone }).format(0);
  } catch {
    context.addIssue({ code: "custom", path: ["timeZone"], message: "Invalid time zone" });
  }
});

export type MemberProfile = z.infer<typeof memberProfileSchema>;
