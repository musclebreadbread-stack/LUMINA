import "server-only";

import { assertValidBirthInput } from "@engine/shared/birth";
import { isLunarConvertible, lunarToSolar } from "@engine/saju/lunar";
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
  try {
    assertValidBirthInput({
      date: { year: profile.year, month: profile.month, day: profile.day },
      calendar: profile.calendar,
    });
  } catch {
    context.addIssue({ code: "custom", path: ["day"], message: "Invalid calendar day" });
  }
  if (profile.calendar === "lunar") {
    if (!isLunarConvertible(profile.year)) {
      context.addIssue({ code: "custom", path: ["year"], message: "Lunar year is outside the supported range" });
    } else {
      try {
        lunarToSolar(profile.year, profile.month, profile.day, profile.isLeapMonth);
      } catch {
        context.addIssue({ code: "custom", path: ["day"], message: "Invalid Korean lunar date" });
      }
    }
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
