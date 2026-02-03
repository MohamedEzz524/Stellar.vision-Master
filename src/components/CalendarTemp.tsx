import React, { useReducer, useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { motion } from 'framer-motion';
import arrowRightIcon from '../assets/arrow-right.svg';
import timeSvg from '../assets/time.svg';
import { autoRotateTexts } from '../constants';
import noiseImg from '../assets/images/noise.webp';
import Button3dWrapper from './Button3dWrapper';

type ViewState = 0 | 1 | 2 | 3 | 4;

interface SelectedDate {
  day: number;
  month: number;
  year: number;
  time?: string;
  startTime?: string;
}

interface AvailableDaysData {
  year: number;
  month: string;
  availableDays: number[];
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  status: 'available' | 'unavailable';
}

interface DayAvailabilityResponse {
  date: string;
  timezone: string;
  slots: TimeSlot[];
}

interface CalendarState {
  viewState: ViewState;
  currentMonth: number;
  currentYear: number;
  selectedDate: SelectedDate | null;
  selectedTime: string | null;
  timezone: string;
  formData: {
    name: string;
    email: string;
    description: string;
    startTime: string;
    timezone: string;
  };
}

type CalendarAction =
  | { type: 'START_CALENDAR' }
  | { type: 'CLOSE_CALENDAR' }
  | { type: 'ANIMATION_COMPLETE' }
  | { type: 'SELECT_DAY'; day: number; month: number; year: number }
  | { type: 'SELECT_TIME'; time: string }
  | { type: 'TOGGLE_TIME_CLOSED' }
  | { type: 'CONFIRM_TIME'; baseTimezoneTime?: string }
  | { type: 'GO_BACK' }
  | { type: 'NAVIGATE_MONTH'; direction: 'prev' | 'next' }
  | { type: 'UPDATE_FORM'; field: string; value: string }
  | { type: 'UPDATE_TIMEZONE'; timezone: string };

// Format date to RFC3339 format with timezone offset
// Converts a Date object to RFC3339 format: "2026-01-10T11:00:00+02:00"
const formatDateToRFC3339 = (date: Date, timezone: string): string => {
  // Format date in target timezone using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Get formatted parts
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const day = parts.find((p) => p.type === 'day')?.value || '';
  const hour = parts.find((p) => p.type === 'hour')?.value || '';
  const minute = parts.find((p) => p.type === 'minute')?.value || '';
  const second = parts.find((p) => p.type === 'second')?.value || '00';

  // Calculate timezone offset for the target timezone at this specific date/time
  // This accounts for DST (Daylight Saving Time) changes
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const offsetMs = tzDate.getTime() - utcDate.getTime();

  // Calculate offset hours and minutes
  const offsetTotalMinutes = Math.floor(offsetMs / (1000 * 60));
  const offsetHours = Math.floor(Math.abs(offsetTotalMinutes) / 60);
  const offsetMinutes = Math.abs(offsetTotalMinutes) % 60;
  const offsetSign = offsetTotalMinutes >= 0 ? '+' : '-';
  const offsetString = `${offsetSign}${offsetHours
    .toString()
    .padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetString}`;
};

const initialState: CalendarState = {
  viewState: 0,
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
  selectedTime: null,
  timezone: 'Africa/Cairo',
  formData: {
    name: 'Hazem Gad',
    email: 'hazemhgad22@gmail.com',
    description: 'Web design consultation',
    startTime: '',
    timezone: 'Africa/Cairo',
  },
};

const calendarReducer = (
  state: CalendarState,
  action: CalendarAction,
): CalendarState => {
  switch (action.type) {
    case 'START_CALENDAR':
      return { ...state, viewState: 1 };

    case 'CLOSE_CALENDAR':
      return {
        ...state,
        viewState: 0,
        selectedDate: null,
        selectedTime: null,
      };

    case 'ANIMATION_COMPLETE':
      return { ...state, viewState: 2 };

    case 'SELECT_DAY':
      return {
        ...state,
        viewState: 3,
        selectedDate: {
          day: action.day,
          month: action.month,
          year: action.year,
        },
      };

    case 'SELECT_TIME':
      return { ...state, selectedTime: action.time };

    case 'TOGGLE_TIME_CLOSED':
      return { ...state, selectedTime: null };

    case 'CONFIRM_TIME': {
      if (!state.selectedDate || !state.selectedTime) return state;

      // Use baseTimezoneTime if provided (converted from display timezone),
      // otherwise use selectedTime (assumes it's already in base timezone)
      const timeToUse = action.baseTimezoneTime || state.selectedTime;

      let startDate: Date;
      let startTimeRFC3339: string;
      let finalTimezone: string;

      // Check if timeToUse is in RFC3339 format (from slots API)
      if (
        timeToUse.includes('T') &&
        (timeToUse.includes('+') || timeToUse.includes('-'))
      ) {
        // If already in RFC3339 format from API, use it directly to preserve timezone
        // Normalize format: remove milliseconds if present (API returns .000, but we might need consistency)
        // Keep the timezone offset as-is from the API response
        startTimeRFC3339 = timeToUse.replace(/\.\d{3}/, ''); // Remove milliseconds if present
        finalTimezone = state.timezone; // Use the timezone that was used to fetch the slot

        // Parse for the Date object (for internal use)
        startDate = new Date(timeToUse);
      } else {
        // Parse "HH:MM AM/PM" format and convert to RFC3339
        const [time, period] = timeToUse.split(' ');
        const [hours, minutes] = time.split(':');
        let hour24 = parseInt(hours);
        if (period === 'PM' && hour24 !== 12) hour24 += 12;
        if (period === 'AM' && hour24 === 12) hour24 = 0;
        startDate = new Date(
          state.selectedDate.year,
          state.selectedDate.month,
          state.selectedDate.day,
          hour24,
          parseInt(minutes),
        );

        // Format date to RFC3339 with timezone offset in the current timezone
        finalTimezone = state.timezone;
        startTimeRFC3339 = formatDateToRFC3339(startDate, finalTimezone);
      }

      return {
        ...state,
        viewState: 4,
        selectedDate: {
          ...state.selectedDate,
          time: state.selectedTime,
          startTime: startDate.toISOString(),
        },
        formData: {
          ...state.formData,
          startTime: startTimeRFC3339, // RFC3339 format with timezone offset from slot or current timezone
          timezone: finalTimezone, // Use the timezone from the slot or current timezone
        },
      };
    }

    case 'GO_BACK':
      if (state.viewState === 3) {
        return { ...state, viewState: 2, selectedTime: null };
      } else if (state.viewState === 4) {
        return { ...state, viewState: 3 };
      }
      return state;

    case 'NAVIGATE_MONTH': {
      const now = new Date();
      const currentMonthIndex = now.getMonth();
      const currentYearValue = now.getFullYear();

      // Check if we're already at or before the current month
      const isAtOrBeforeCurrentMonth =
        state.currentYear < currentYearValue ||
        (state.currentYear === currentYearValue &&
          state.currentMonth <= currentMonthIndex);

      if (action.direction === 'prev') {
        // Prevent going to months before the current month
        if (isAtOrBeforeCurrentMonth) {
          return state; // Don't navigate if already at or before current month
        }

        let newMonth = state.currentMonth;
        let newYear = state.currentYear;

        if (newMonth === 0) {
          newMonth = 11;
          newYear -= 1;
        } else {
          newMonth -= 1;
        }

        // Double check the new month isn't before current month
        if (
          newYear < currentYearValue ||
          (newYear === currentYearValue && newMonth < currentMonthIndex)
        ) {
          return state; // Prevent navigation
        }

        return { ...state, currentMonth: newMonth, currentYear: newYear };
      } else {
        // Allow forward navigation
        let newMonth = state.currentMonth;
        let newYear = state.currentYear;

        if (newMonth === 11) {
          newMonth = 0;
          newYear += 1;
        } else {
          newMonth += 1;
        }

        return { ...state, currentMonth: newMonth, currentYear: newYear };
      }
    }

    case 'UPDATE_FORM':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.field]: action.value,
        },
      };

    case 'UPDATE_TIMEZONE':
      return {
        ...state,
        timezone: action.timezone,
        formData: {
          ...state.formData,
          timezone: action.timezone,
        },
      };

    default:
      return state;
  }
};

const Calendar = () => {
  const [state, dispatch] = useReducer(calendarReducer, initialState);
  const [availableDaysData, setAvailableDaysData] = useState<
    AvailableDaysData[]
  >([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    description?: string;
    startTime?: string;
    timezone?: string;
  }>({});

  const calendarRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLDivElement>(null);
  const timeButtonsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // localStorage key for successful submission token
  const SUBMISSION_TOKEN_KEY = 'calendar_booking_submitted';

  // Validation regex patterns
  const validationPatterns = {
    name: /^[a-zA-Z0-9\s'-]{2,50}$/, // 2-50 characters, letters, numbers, spaces, hyphens, apostrophes
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Standard email format
    description: /^[\s\S]{4,500}$/, // 4-500 characters, any text
    startTime:
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)$/, // RFC3339 format
    timezone: /^[A-Za-z_][A-Za-z0-9_/+-]*$/, // Timezone format like "Africa/Cairo", "UTC", "America/New_York", etc.
  };

  // Validation error messages
  const validationMessages = {
    name: 'Name must be 2-50 characters and contain only letters, numbers, spaces, hyphens, and apostrophes',
    email: 'Please enter a valid email address',
    description: 'Description must be between 4 and 500 characters',
    startTime: 'Start time is required and must be in valid format',
    timezone: 'Timezone must be in valid format (e.g., Africa/Cairo or UTC)',
  };

  // Validate a single field
  const validateField = (field: string, value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }

    const pattern =
      validationPatterns[field as keyof typeof validationPatterns];
    if (pattern && !pattern.test(value.trim())) {
      return validationMessages[field as keyof typeof validationMessages];
    }

    return undefined;
  };

  // Validate all form fields (returns all errors including hidden fields)
  const validateAllFields = (): {
    visibleErrors: typeof fieldErrors;
    allErrors: Array<{ field: string; error: string }>;
  } => {
    const { name, email, description, startTime, timezone } = state.formData;
    const allErrors: Array<{ field: string; error: string }> = [];

    const nameError = validateField('name', name);
    if (nameError) allErrors.push({ field: 'name', error: nameError });

    const emailError = validateField('email', email);
    if (emailError) allErrors.push({ field: 'email', error: emailError });

    const descriptionError = validateField('description', description);
    if (descriptionError)
      allErrors.push({ field: 'description', error: descriptionError });

    const startTimeError = validateField('startTime', startTime);
    if (startTimeError)
      allErrors.push({ field: 'startTime', error: startTimeError });

    const timezoneError = validateField('timezone', timezone);
    if (timezoneError)
      allErrors.push({ field: 'timezone', error: timezoneError });

    // Only return visible field errors for UI display
    const visibleErrors: typeof fieldErrors = {
      ...(nameError && { name: nameError }),
      ...(emailError && { email: emailError }),
      ...(descriptionError && { description: descriptionError }),
    };

    return { visibleErrors, allErrors };
  };

  // Base timezone for available time slots (all times are based on this)
  const BASE_TIMEZONE = 'Africa/Cairo';

  // Fetch available days from API
  const fetchAvailableDays = async (years: number[], timezone: string) => {
    if (!years || years.length === 0) {
      return;
    }

    try {
      // Use proxy URL in development, full URL in production
      // The proxy is configured in vite.config.ts
      const isDevelopment = import.meta.env.DEV;
      const baseUrl = isDevelopment
        ? '/api'
        : 'https://calender-stellervision-production.up.railway.app/api';

      // Fetch data for all required years in parallel
      const fetchPromises = years.map((year) => {
        const url = `${baseUrl}/availability/year?year=${year}&timezone=${encodeURIComponent(timezone)}`;

        return fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          mode: 'cors',
        }).then((response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to fetch available days for year ${year}: ${response.status} ${response.statusText}`,
            );
          }
          return response.json();
        });
      });

      const results = await Promise.all(fetchPromises);

      // Merge all years' data into a single array
      const mergedData: AvailableDaysData[] = results.flat();
      setAvailableDaysData(mergedData);
      return mergedData;
    } catch (error) {
      console.error('Error fetching available days:', error);
      // Set empty array on error to prevent app crash
      setAvailableDaysData([]);
      throw error;
    }
  };

  // Check localStorage for successful submission token on mount and when entering confirm state
  useEffect(() => {
    if (state.viewState === 4) {
      const token = localStorage.getItem(SUBMISSION_TOKEN_KEY);
      if (token) {
        setSubmitSuccess(true);
      }
    }
  }, [state.viewState]);

  // Fetch available days on mount and when year/timezone changes
  useEffect(() => {
    const viewedYear = state.currentYear;
    const timezone = state.timezone;
    const now = new Date();
    const currentYearValue = now.getFullYear();

    // Determine which years to fetch
    // Calendar allows viewing current month + next 2 months, so we need:
    // 1. Current year (today's year) - always needed
    // 2. Viewed year (might be different if viewing near year boundary)
    // 3. Next year (if viewing November/December or already in next year)
    const yearsToFetch = new Set<number>([currentYearValue, viewedYear]);

    // If viewing November or December (months 10 or 11) in current year, fetch next year
    // Or if already viewing next year's months, fetch the year after
    if (
      (viewedYear === currentYearValue && state.currentMonth >= 10) ||
      viewedYear > currentYearValue
    ) {
      yearsToFetch.add(viewedYear + 1);
    }

    fetchAvailableDays(Array.from(yearsToFetch), timezone).catch(() => {
      // Error is already handled in fetchAvailableDays (empty array is set as fallback)
    });
  }, [state.currentYear, state.timezone, state.currentMonth]);

  // Fetch available time slots for a specific day
  const fetchDaySlots = async (
    year: number,
    month: number,
    day: number,
    timezone: string,
  ) => {
    setIsLoadingSlots(true);
    try {
      // Format date as YYYY-MM-DD
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Use proxy URL in development, full URL in production
      const isDevelopment = import.meta.env.DEV;
      const baseUrl = isDevelopment
        ? '/api'
        : 'https://calender-stellervision-production.up.railway.app/api';
      const url = `${baseUrl}/availability/day?date=${dateStr}&timezone=${encodeURIComponent(timezone)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch slots: ${response.status} ${response.statusText}`,
        );
      }

      const data: DayAvailabilityResponse = await response.json();

      // Filter only available slots
      const available = data.slots.filter(
        (slot) => slot.status === 'available',
      );

      setAvailableSlots(available);
    } catch (error) {
      console.error('Error fetching day slots:', error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Fetch slots when a day is selected (viewState becomes 3)
  useEffect(() => {
    if (state.viewState === 3 && state.selectedDate) {
      const { year, month, day } = state.selectedDate;
      fetchDaySlots(year, month, day, state.timezone);
    } else {
      // Clear slots when not in time selection view
      setAvailableSlots([]);
    }
  }, [state.viewState, state.selectedDate, state.timezone]);

  // Configuration for available time slots (in BASE_TIMEZONE)
  const startTime = '12:00 PM'; // Start time in Africa/Cairo
  const endTime = '05:00 PM'; // End time in Africa/Cairo
  const intervalMinutes = 15; // Interval between slots

  // Generate time slots between start and end time in 15-minute intervals
  const generateTimeSlots = (
    start: string,
    end: string,
    interval: number,
  ): string[] => {
    const slots: string[] = [];

    // Parse start time
    const [startTimeStr, startPeriod] = start.split(' ');
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    let startHour24 = startHours;
    if (startPeriod === 'PM' && startHour24 !== 12) startHour24 += 12;
    if (startPeriod === 'AM' && startHour24 === 12) startHour24 = 0;

    // Parse end time
    const [endTimeStr, endPeriod] = end.split(' ');
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
    let endHour24 = endHours;
    if (endPeriod === 'PM' && endHour24 !== 12) endHour24 += 12;
    if (endPeriod === 'AM' && endHour24 === 12) endHour24 = 0;

    // Convert to minutes for easier calculation
    const startTotalMinutes = startHour24 * 60 + startMinutes;
    const endTotalMinutes = endHour24 * 60 + endMinutes;

    // Generate slots
    for (
      let currentMinutes = startTotalMinutes;
      currentMinutes <= endTotalMinutes;
      currentMinutes += interval
    ) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;

      // Format as 12-hour time
      let hour12 = hours % 12;
      if (hour12 === 0) hour12 = 12; // 0 or 12 both become 12
      const period = hours >= 12 ? 'PM' : 'AM';
      const formattedTime = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;

      slots.push(formattedTime);
    }

    return slots;
  };

  // Base available times in Africa/Cairo timezone (generated dynamically)
  const baseAvailableTimes = generateTimeSlots(
    startTime,
    endTime,
    intervalMinutes,
  );

  // Convert time from base timezone (Africa/Cairo) to target timezone (for display)
  const convertTimeToTimezone = (
    timeString: string,
    targetTimezone: string,
  ): string => {
    // If target is the same as base, return as is
    if (targetTimezone === BASE_TIMEZONE) {
      return timeString;
    }

    // Parse the time string (e.g., "09:00 AM")
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;

    // Get today's date in base timezone (Africa/Cairo)
    const now = new Date();
    const baseDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: BASE_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const [baseYear, baseMonth, baseDay] = baseDateStr.split('-').map(Number);

    // Find the UTC timestamp that represents this time in base timezone (Cairo)
    // We'll search for the UTC time that formats to our target in Cairo
    const dateStr = `${baseYear}-${String(baseMonth).padStart(2, '0')}-${String(baseDay).padStart(2, '0')}T${String(hour24).padStart(2, '0')}:${minutes}:00`;

    // Start with a reasonable UTC guess (treating the date string as UTC)
    let utcTime = new Date(dateStr + 'Z').getTime();

    // Refine by checking what this UTC time represents in base timezone
    // and adjusting until we get the correct time
    for (let i = 0; i < 20; i++) {
      const testDate = new Date(utcTime);
      const baseFormatted = new Intl.DateTimeFormat('en-US', {
        timeZone: BASE_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(testDate);

      const [testH, testM] = baseFormatted.split(':').map(Number);
      const targetH = hour24;
      const targetM = parseInt(minutes);

      if (testH === targetH && testM === targetM) {
        break; // Found the correct UTC time
      }

      // Adjust UTC time based on the difference
      const diffHours = targetH - testH;
      const diffMinutes = targetM - testM;
      const diffMs = (diffHours * 60 + diffMinutes) * 60 * 1000;
      utcTime += diffMs;
    }

    // Now format this UTC time in the target timezone (for display)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTimezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(new Date(utcTime));
  };

  // Convert time from display timezone back to base timezone (Africa/Cairo)
  // This is used when user selects a time - we need to know what time it is in Cairo
  const convertTimeFromDisplayToBase = (
    timeString: string, // Time displayed in current timezone
    displayTimezone: string, // Current display timezone
    selectedDate: { year: number; month: number; day: number }, // Selected date
  ): string => {
    // If display timezone is already base timezone, return as is
    if (displayTimezone === BASE_TIMEZONE) {
      return timeString;
    }

    // Parse the displayed time string (e.g., "02:00 PM")
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;

    // Create a date object for the selected date at this time in the display timezone
    // We need to find what UTC time represents this time in the display timezone
    const dateStr = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}T${String(hour24).padStart(2, '0')}:${minutes}:00`;

    // Start with a reasonable UTC guess
    let utcTime = new Date(dateStr + 'Z').getTime();

    // Refine by checking what this UTC time represents in display timezone
    for (let i = 0; i < 20; i++) {
      const testDate = new Date(utcTime);
      const displayFormatted = new Intl.DateTimeFormat('en-US', {
        timeZone: displayTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(testDate);

      const [testH, testM] = displayFormatted.split(':').map(Number);
      const targetH = hour24;
      const targetM = parseInt(minutes);

      if (testH === targetH && testM === targetM) {
        break; // Found the correct UTC time
      }

      // Adjust UTC time based on the difference
      const diffHours = targetH - testH;
      const diffMinutes = targetM - testM;
      const diffMs = (diffHours * 60 + diffMinutes) * 60 * 1000;
      utcTime += diffMs;
    }

    // Now format this UTC time in the base timezone (Africa/Cairo)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: BASE_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(new Date(utcTime));
  };

  // Format slot time for display
  const formatSlotTime = (
    slotStartTime: string, // Format: "2026-01-12T13:00:00.000+02:00"
    displayTimezone: string,
  ): string => {
    // Parse the slot time (it's in RFC3339 format with timezone offset)
    const date = new Date(slotStartTime);

    // Format in the display timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: displayTimezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return formatter.format(date);
  };

  // Get available times - use fetched slots if available, otherwise use generated times
  const availableTimes =
    availableSlots.length > 0
      ? availableSlots.map((slot) =>
          formatSlotTime(slot.start_time, state.timezone),
        )
      : baseAvailableTimes.map((time) =>
          convertTimeToTimezone(time, state.timezone),
        );

  // Auto-complete animation state when calendar opens
  useEffect(() => {
    if (state.viewState === 1) {
      // Immediately move to state 2 (animation complete) since we're not animating
      dispatch({ type: 'ANIMATION_COMPLETE' });
    }
  }, [state.viewState]);

  // Prevent body scroll when calendar is open
  useEffect(() => {
    if (state.viewState !== 0) {
      // Calendar is open - lock body scroll
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.overflow = 'hidden';

      // Ensure calendar container can still receive scroll events
      if (calendarRef.current) {
        calendarRef.current.focus();
      }
    } else {
      // Calendar is closed - restore body scroll
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.overflow = '';

      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup: restore body when component unmounts
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [state.viewState]);

  // Get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Get month name
  const getMonthName = (month: number) => {
    const months = [
      'JANUARY',
      'FEBRUARY',
      'MARCH',
      'APRIL',
      'MAY',
      'JUNE',
      'JULY',
      'AUGUST',
      'SEPTEMBER',
      'OCTOBER',
      'NOVEMBER',
      'DECEMBER',
    ];
    return months[month];
  };

  // Get month abbreviation (for matching with availableDaysData)
  const getMonthAbbreviation = (month: number) => {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[month];
  };

  // Check if a day is in the available days list for a given month/year
  const isDayAvailable = (
    day: number,
    month: number,
    year: number,
  ): boolean => {
    const monthAbbr = getMonthAbbreviation(month);
    const monthData = availableDaysData.find(
      (data) => data.year === year && data.month === monthAbbr,
    );

    if (!monthData) {
      return false;
    }

    return monthData.availableDays.includes(day);
  };

  // Check if current month is within the allowed range (current month and next 2 months)
  const isMonthInAllowedRange = (month: number, year: number): boolean => {
    const now = new Date();
    const currentMonthIndex = now.getMonth();
    const currentYearValue = now.getFullYear();

    // Calculate months from current month
    const monthsFromCurrent =
      (year - currentYearValue) * 12 + (month - currentMonthIndex);

    // Allow current month (0) and next 2 months (1, 2)
    return monthsFromCurrent >= 0 && monthsFromCurrent <= 2;
  };

  // Generate calendar grid
  const generateCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(state.currentMonth, state.currentYear);
    const firstDay = getFirstDayOfMonth(state.currentMonth, state.currentYear);
    const days: (number | null)[] = [];

    // Add empty cells for days before month starts
    // JavaScript: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    // We want: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
    // Conversion: (jsDay + 1) % 7
    const adjustedFirstDay = (firstDay + 1) % 7; // Saturday becomes 0
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  // Check if previous month navigation is disabled (can't go before current month)
  const isPreviousMonthDisabled = () => {
    const now = new Date();
    const currentMonthIndex = now.getMonth();
    const currentYearValue = now.getFullYear();

    return (
      state.currentYear < currentYearValue ||
      (state.currentYear === currentYearValue &&
        state.currentMonth <= currentMonthIndex)
    );
  };

  // Check if next month navigation is disabled (can't go beyond current + 2 months)
  const isNextMonthDisabled = () => {
    // Calculate what the next month would be
    let nextMonth = state.currentMonth + 1;
    let nextYear = state.currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }

    // Check if next month would be beyond allowed range
    return !isMonthInAllowedRange(nextMonth, nextYear);
  };

  // Check if a day should be disabled
  const isDayDisabled = (day: number) => {
    const now = new Date();
    const currentMonthIndex = now.getMonth();
    const currentYearValue = now.getFullYear();
    const currentDay = now.getDate();

    // If month is beyond allowed range (current + next 2 months), disable all days
    if (!isMonthInAllowedRange(state.currentMonth, state.currentYear)) {
      return true;
    }

    // Check if day is in available days list - if not, disable it
    if (!isDayAvailable(day, state.currentMonth, state.currentYear)) {
      return true;
    }

    // For current month only: disable days before today OR within today + 3 days (including today)
    // This overrides the available days check
    if (
      state.currentYear === currentYearValue &&
      state.currentMonth === currentMonthIndex
    ) {
      // Disable if day is before today OR within today + 3 days (including today)
      if (day < currentDay || day <= currentDay + 3) {
        return true;
      }
    }

    return false;
  };

  // Navigate months
  const handlePreviousMonth = () => {
    if (!isPreviousMonthDisabled()) {
      dispatch({ type: 'NAVIGATE_MONTH', direction: 'prev' });
    }
  };

  const handleNextMonth = () => {
    if (!isNextMonthDisabled()) {
      dispatch({ type: 'NAVIGATE_MONTH', direction: 'next' });
    }
  };

  // Handle day selection
  const handleDayClick = (day: number) => {
    dispatch({
      type: 'SELECT_DAY',
      day,
      month: state.currentMonth,
      year: state.currentYear,
    });
  };

  // Handle time selection - only one NEXT button visible at a time
  const handleTimeClick = (time: string) => {
    // If clicking the same time, toggle it closed
    if (state.selectedTime === time) {
      const timeButtonRef = timeButtonsRef.current[time];
      if (timeButtonRef) {
        const timeButton = timeButtonRef.querySelector(
          '.time-button',
        ) as HTMLElement;
        const nextButton = timeButtonRef.querySelector(
          '.next-button',
        ) as HTMLElement;
        if (timeButton && nextButton) {
          gsap.to(timeButton, { width: '100%', duration: 0.3 });
          gsap.to(nextButton, {
            width: '0%',
            opacity: 0,
            paddingInline: '0px',
            duration: 0.3,
          });
        }
      }
      dispatch({ type: 'TOGGLE_TIME_CLOSED' });
      return;
    }

    // Close any previously opened time button
    if (state.selectedTime) {
      const prevTimeButtonRef = timeButtonsRef.current[state.selectedTime];
      if (prevTimeButtonRef) {
        const prevTimeButton = prevTimeButtonRef.querySelector(
          '.time-button',
        ) as HTMLElement;
        const prevNextButton = prevTimeButtonRef.querySelector(
          '.next-button',
        ) as HTMLElement;
        if (prevTimeButton && prevNextButton) {
          gsap.to(prevTimeButton, { width: '100%', duration: 0.3 });
          gsap.to(prevNextButton, {
            width: '0%',
            opacity: 0,
            paddingInline: '0px',
            duration: 0.3,
          });
        }
      }
    }

    // Open the new time button
    dispatch({ type: 'SELECT_TIME', time });
    const timeButtonRef = timeButtonsRef.current[time];
    if (timeButtonRef) {
      const timeButton = timeButtonRef.querySelector(
        '.time-button',
      ) as HTMLElement;
      const nextButton = timeButtonRef.querySelector(
        '.next-button',
      ) as HTMLElement;
      if (timeButton && nextButton) {
        gsap.to(timeButton, {
          width: '50%',
          duration: 0.3,
          ease: 'power2.out',
        });
        gsap.to(nextButton, {
          width: '50%',
          opacity: 1,
          paddingInline: '16px',
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    }
  };

  // Handle next button click (from time selection)
  const handleTimeNext = () => {
    if (state.selectedDate && state.selectedTime) {
      let baseTimezoneTime: string;

      // If we have slots, find the matching slot and use its start_time
      if (availableSlots.length > 0) {
        // Find the slot whose formatted time matches the selected time
        const matchingSlot = availableSlots.find((slot) => {
          const formattedTime = formatSlotTime(slot.start_time, state.timezone);
          return formattedTime === state.selectedTime;
        });

        if (matchingSlot) {
          // Use the slot's start_time directly (it's already in RFC3339 format with the timezone used to fetch it)
          baseTimezoneTime = matchingSlot.start_time;
        } else {
          // Fallback: convert the displayed time back to base timezone
          baseTimezoneTime = convertTimeFromDisplayToBase(
            state.selectedTime,
            state.timezone,
            state.selectedDate,
          );
        }
      } else {
        // No slots available, use the conversion logic
        baseTimezoneTime = convertTimeFromDisplayToBase(
          state.selectedTime,
          state.timezone,
          state.selectedDate,
        );
      }

      // Dispatch with the base timezone time
      dispatch({ type: 'CONFIRM_TIME', baseTimezoneTime });
    }
  };

  // Format date for display
  const formatSelectedDateTime = () => {
    if (!state.selectedDate || !state.selectedTime) return '';

    const selectedDate = state.selectedDate; // Type narrowing
    const date = new Date(
      selectedDate.year,
      selectedDate.month,
      selectedDate.day,
    );
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Convert time to 12-hour format with lowercase pm/am
    const [time, period] = state.selectedTime.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;

    const startDate = new Date(
      selectedDate.year,
      selectedDate.month,
      selectedDate.day,
      hour24,
      parseInt(minutes),
    );

    const startHour = startDate.getHours();
    const startMin = startDate.getMinutes();

    const startTime = `${startHour % 12 || 12}:${startMin.toString().padStart(2, '0')}${startHour >= 12 ? 'pm' : 'am'}`;

    return `${startTime}, ${dayNames[date.getDay()]}, ${monthNames[selectedDate.month]} ${selectedDate.day}, ${selectedDate.year}`;
  };

  // Handle back button
  const handleBack = () => {
    if (state.viewState === 3) {
      // Close any open time button
      if (state.selectedTime) {
        const timeButtonRef = timeButtonsRef.current[state.selectedTime];
        if (timeButtonRef) {
          const timeButton = timeButtonRef.querySelector(
            '.time-button',
          ) as HTMLElement;
          const nextButton = timeButtonRef.querySelector(
            '.next-button',
          ) as HTMLElement;
          if (timeButton && nextButton) {
            gsap.to(timeButton, { width: '100%', duration: 0.3 });
            gsap.to(nextButton, {
              width: '0%',
              opacity: 0,
              paddingInline: '0px',
              duration: 0.3,
            });
          }
        }
      }
    }
    dispatch({ type: 'GO_BACK' });
  };

  // Handle form input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const fieldName = e.target.name;
    const value = e.target.value;

    dispatch({
      type: 'UPDATE_FORM',
      field: fieldName,
      value: value,
    });

    // Clear error for this field when user starts typing
    if (fieldErrors[fieldName as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName as keyof typeof newErrors];
        return newErrors;
      });
    }
  };

  // Handle field blur (validate on blur)
  const handleFieldBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const fieldName = e.target.name;
    const value = e.target.value;
    const error = validateField(fieldName, value);

    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));
  };

  // Handle timezone change
  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'UPDATE_TIMEZONE', timezone: e.target.value });
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    // Validate all fields before submitting (including hidden fields)
    const { visibleErrors, allErrors } = validateAllFields();

    if (allErrors.length > 0) {
      // Set visible field errors for UI
      setFieldErrors(visibleErrors);

      // Show general error if hidden fields (startTime, timezone) have errors
      const hiddenErrors = allErrors.filter(
        (err) => err.field === 'startTime' || err.field === 'timezone',
      );
      if (hiddenErrors.length > 0) {
        const hiddenErrorMessages = hiddenErrors.map(
          (err) =>
            `${err.field === 'startTime' ? 'Start time' : 'Timezone'}: ${err.error}`,
        );
        setSubmitError(
          `Form validation failed: ${hiddenErrorMessages.join('; ')}. Please select a time slot again.`,
        );
      }
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData with all form fields
      const formData = new FormData();
      formData.append('access_key', '5390b48e-4403-4de3-91ff-c532ff505dcb');
      formData.append('name', state.formData.name);
      formData.append('email', state.formData.email);
      formData.append('description', state.formData.description);
      formData.append('startTime', state.formData.startTime);
      formData.append('timezone', state.formData.timezone);

      // Log the data being sent for debugging
      console.log('Sending form data to web3forms:', {
        name: state.formData.name,
        email: state.formData.email,
        description: state.formData.description,
        startTime: state.formData.startTime,
        timezone: state.formData.timezone,
      });

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status, response.statusText);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            `Failed to submit form: ${response.status} ${response.statusText}`,
        );
      }

      console.log('Form submitted successfully:', data);

      // Store token in localStorage to persist successful submission
      localStorage.setItem(SUBMISSION_TOKEN_KEY, 'true');

      // Show success message instead of closing
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while submitting the form. Please try again.';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get timezone display name (using CSS uppercase)
  const getTimezoneDisplayName = (tz: string) => {
    // Convert "Africa/Cairo" to "Africa / Cairo" (CSS will uppercase)
    return tz.split('/').join(' / ');
  };

  // Simple globe SVG icon
  const GlobeIcon = () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );

  // Get current time in timezone
  const getCurrentTimeInTimezone = (tz: string) => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(now);
  };

  // Timezones list - Egypt, UAE, KSA only
  const timezones = [
    'Africa/Cairo', // Egypt
    'Asia/Dubai', // UAE (Emirates)
    'Asia/Riyadh', // KSA (Saudi Arabia)
  ];

  const calendarDays = generateCalendarGrid();
  const weekdays = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];

  // Get title for current state
  const getTitle = () => {
    switch (state.viewState) {
      case 1:
      case 2:
        return 'SELECT A DAY';
      case 3:
        return 'SELECT A TIME';
      case 4:
        return submitSuccess ? 'SUCCESS' : 'CONFIRM';
      default:
        return '';
    }
  };

  return (
    <div
      ref={calendarRef}
      className={`text-textPrimary pointer-events-auto absolute top-0 z-[99999] flex h-screen w-full flex-col overflow-y-auto bg-transparent transition-transform duration-800 outline-none ${
        state.viewState === 0
          ? 'translate-y-[calc(100%-77px)]'
          : 'translate-y-0'
      }`}
      tabIndex={-1}
      onWheel={(e) => {
        // Ensure wheel events are handled by this container
        e.stopPropagation();
      }}
    >
      <div className="relative h-auto flex-1 pb-4">
        <div
          className={`pointer-events-none absolute inset-0 -z-1 bg-black ${
            state.viewState === 0
              ? 'opacity-0 transition-opacity duration-800'
              : 'opacity-100'
          }`}
        />
        {/* Start Now Button - Always visible */}
        <div
          ref={startButtonRef}
          className="relative z-10 flex h-[77px] items-center justify-center bg-transparent"
        >
          <div className="h-full w-auto max-w-[300px] lg:max-w-[400px]">
            <Button3dWrapper
              onClick={() => {
                if (state.viewState === 0) {
                  dispatch({ type: 'START_CALENDAR' });
                } else {
                  dispatch({ type: 'CLOSE_CALENDAR' });
                }
              }}
              viewState={state.viewState}
            />
          </div>
        </div>
        <div>
          <div className="mx-auto max-w-lg">
            {/* Header Container - Title and Back Button */}
            {(state.viewState === 1 ||
              state.viewState === 2 ||
              state.viewState === 3 ||
              state.viewState === 4) && (
              <div className="relative z-10 my-4 flex w-full items-center lg:my-8">
                {/* Back Button - Left */}
                {(state.viewState === 3 || state.viewState === 4) && (
                  <button
                    onClick={handleBack}
                    className="absolute left-0 text-[10px] font-normal uppercase hover:underline lg:text-lg"
                  >
                    &lt; BACK
                  </button>
                )}
                {/* Title - Centered */}
                {(state.viewState === 1 || state.viewState === 2) && (
                  <h2
                    key="select-day-title"
                    className="mx-auto inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black uppercase lg:px-3 lg:py-1 lg:text-sm"
                  >
                    {getTitle()}
                  </h2>
                )}
                {(state.viewState === 3 || state.viewState === 4) && (
                  <h2
                    key="other-title"
                    className="mx-auto inline-block rounded-full bg-white px-3 py-1 text-xs font-bold text-black uppercase lg:text-sm"
                  >
                    {getTitle()}
                  </h2>
                )}
              </div>
            )}

            {/* State 2: Select Day */}
            {(state.viewState === 1 || state.viewState === 2) && (
              <div className="relative z-10 flex flex-1 flex-col p-4 lg:p-0">
                {/* Month/Year Navigation */}
                <div className="font-grid mb-4 flex items-center justify-center gap-4 lg:mb-6">
                  <motion.button
                    initial={{ x: -100 }}
                    animate={{ x: 0 }}
                    transition={{
                      x: { duration: 0.4, delay: 0.4, ease: 'easeOut' },
                    }}
                    onClick={handlePreviousMonth}
                    disabled={isPreviousMonthDisabled()}
                    className="disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <img
                      src={arrowRightIcon}
                      alt="Previous"
                      className="h-4 w-4 rotate-180 lg:h-8 lg:w-8"
                    />
                  </motion.button>
                  <motion.span
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      y: { duration: 0.4, delay: 0.4, ease: 'easeOut' },
                      opacity: { duration: 0.4, delay: 0.4 },
                    }}
                    className="text-xl font-bold lg:text-3xl"
                  >
                    {getMonthName(state.currentMonth)} {state.currentYear}
                  </motion.span>
                  <motion.button
                    initial={{ x: 100 }}
                    animate={{ x: 0 }}
                    transition={{
                      x: { duration: 0.4, delay: 0.4, ease: 'easeOut' },
                    }}
                    onClick={handleNextMonth}
                    disabled={isNextMonthDisabled()}
                    className="disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <img
                      src={arrowRightIcon}
                      alt="Next"
                      className="h-4 w-4 lg:h-8 lg:w-8"
                    />
                  </motion.button>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1">
                  <div className="w-full">
                    {/* Weekday Headers */}
                    <div className="mb-4 grid grid-cols-7 gap-2 lg:mb-6 lg:gap-4">
                      {weekdays.map((day) => (
                        <motion.div
                          key={day}
                          initial={{ y: -20, opacity: 0, scale: 0.8 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          transition={{
                            y: {
                              duration: 0.4,
                              delay: 0.4,
                              ease: 'easeOut',
                            },
                            opacity: {
                              duration: 0.4,
                              delay: 0.4,
                            },
                            scale: {
                              duration: 0.4,
                              delay: 0.4,
                              ease: 'easeOut',
                            },
                          }}
                          className="rounded-xl text-center text-[9px] font-bold uppercase shadow-[inset_1px_0_0_0_rgba(255,255,255,0.1),inset_-1px_0_0_0_rgba(255,255,255,0.1),inset_0_4px_6px_rgba(255,255,255,0.6)] lg:text-sm"
                        >
                          {day}
                        </motion.div>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-2 lg:gap-4">
                      {calendarDays.map((day, index) => {
                        const isDisabled = day !== null && isDayDisabled(day);
                        return (
                          <motion.button
                            key={index}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                              scale: 1,
                              opacity: day === null ? 0 : 1,
                            }}
                            transition={{
                              scale: {
                                duration: 0.4,
                                delay: 0.4,
                                ease: 'easeOut',
                              },
                              opacity: {
                                duration: 0.4,
                                delay: 0.4,
                              },
                            }}
                            onClick={() =>
                              day !== null && !isDisabled && handleDayClick(day)
                            }
                            disabled={day === null || isDisabled}
                            className={`aspect-square rounded-md text-center text-xs font-bold md:rounded-xl lg:text-xl ${
                              day === null
                                ? 'cursor-default opacity-0'
                                : isDisabled
                                  ? 'calendar-day-disabled cursor-not-allowed'
                                  : 'calendar-day-available'
                            }`}
                          >
                            {day !== null
                              ? day.toString().padStart(2, '0')
                              : ''}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Timezone Selector */}
                <div className="mx-auto mt-2 flex w-fit items-center gap-1 lg:gap-2">
                  <GlobeIcon />
                  <div className="relative">
                    <select
                      value={state.timezone}
                      onChange={handleTimezoneChange}
                      aria-label="Select timezone"
                      title="Select timezone"
                      className="bg-bgPrimary w-fit appearance-none rounded-md px-4 py-3 pr-12 text-[10px] text-white uppercase focus:outline-none lg:text-base"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='12' height='8' fill='white'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '12px 8px',
                      }}
                    >
                      {timezones.map((tz) => (
                        <option
                          key={tz}
                          value={tz}
                          className="bg-bgPrimary uppercase"
                        >
                          {getTimezoneDisplayName(tz)} (
                          {getCurrentTimeInTimezone(tz)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* AUTO ROTATE TEXT */}
                <div className="border-textPrimary relative mx-auto mt-4 h-12 w-[240px] overflow-hidden rounded-md border-2 lg:h-17 lg:w-lg lg:border-3">
                  <div className="relative h-full w-full">
                    <div
                      className="noise-move-slow-animation absolute inset-0 z-0"
                      style={{
                        backgroundImage: `url(${noiseImg})`,
                        backgroundRepeat: 'repeat',
                        backgroundSize: '100px 100px',
                      }}
                    />
                    {/* AUTO ROTATE TEXT ANIMATION */}
                    <div className="font-grid absolute inset-0 z-0 overflow-hidden text-2xl lg:text-4xl">
                      <div className="scroll-text-animation gap:[240px] left-1/2 flex h-full flex-row items-center lg:gap-[32rem]">
                        {autoRotateTexts.map((text: string, index: number) => (
                          <div
                            key={text.slice(0, 5) + index}
                            className="text-textPrimary whitespace-nowrap"
                          >
                            {text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* State 3: Select Time */}
            {state.viewState === 3 && (
              <div className="relative z-10 flex flex-col p-4 lg:p-0">
                {/* Time Buttons */}
                <div className="flex-1">
                  <div className="space-y-3">
                    {isLoadingSlots ? (
                      <div className="py-8 text-center text-white">
                        Loading available time slots...
                      </div>
                    ) : availableTimes.length === 0 ? (
                      <div className="py-5 text-center text-white lg:py-8">
                        No available time slots for this day.
                      </div>
                    ) : (
                      availableTimes.map((time, index) => (
                        <div
                          key={time}
                          ref={(el) => {
                            timeButtonsRef.current[time] = el;
                          }}
                          className="flex gap-2 overflow-hidden"
                        >
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              duration: 0.4,
                              delay: 0.05 * index,
                              ease: 'easeOut',
                            }}
                            onClick={() => handleTimeClick(time)}
                            className="time-button w-full rounded-md bg-[#333] px-4 py-3 text-center text-xs shadow-[inset_3px_0_0_rgba(255,255,255,0.04),inset_-3px_0_0_0px_rgba(255,255,255,0.04),inset_0_2px_4px_rgba(255,255,255,0.6)] lg:rounded-xl lg:py-3 lg:text-sm"
                          >
                            {time}
                          </motion.button>
                          <button
                            onClick={handleTimeNext}
                            className="next-button calendar-day-available big w-0 overflow-hidden rounded-md py-3 text-center text-xs font-bold lg:rounded-xl lg:py-3 lg:text-sm"
                          >
                            NEXT
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* State 4: Confirm */}
            {state.viewState === 4 && (
              <div className="relative z-10 mt-6 flex w-full flex-col px-4 lg:mt-[77px] lg:px-0">
                {/* Info Section */}
                <div className="[&>img>path]:text-textPrimary mb-8 space-y-4 lg:space-y-2">
                  <p className="flex items-center gap-2 text-sm lg:text-lg">
                    <img
                      src={timeSvg}
                      alt="time"
                      className="stroke-textPrimary h-6 w-6 lg:h-8 lg:w-8"
                    />
                    15 min
                  </p>
                  <p className="flex items-center gap-2 text-sm opacity-100">
                    <img
                      src={timeSvg}
                      alt="time"
                      className="h-6 w-6 lg:h-8 lg:w-8"
                    />
                    Web conferencing details provided upon confirmation.
                  </p>
                  <p className="flex items-center gap-2 text-sm font-bold lg:text-lg">
                    <img
                      src={timeSvg}
                      alt="time"
                      className="h-6 w-6 lg:h-8 lg:w-8"
                    />
                    {formatSelectedDateTime()}
                  </p>
                  <p className="flex items-center gap-2 text-sm lg:text-lg">
                    <img
                      src={timeSvg}
                      alt="time"
                      className="h-6 w-6 lg:h-8 lg:w-8"
                    />
                    {getTimezoneDisplayName(
                      state.formData.timezone,
                    ).toUpperCase()}
                  </p>
                </div>

                {/* Success Message */}
                {submitSuccess ? (
                  <div className="w-full space-y-6">
                    <h3 className="font-grid text-2xl font-bold uppercase lg:text-[2rem]">
                      Booking confirmed!
                    </h3>
                    <div className="rounded-md border border-green-500 bg-green-500/20 px-4 py-6 text-white">
                      <p className="mb-4 text-sm font-semibold lg:text-lg">
                        Thank you for your booking!
                      </p>
                      <p className="mb-2 text-xs lg:text-sm">
                        Your booking has been submitted successfully. We'll send
                        you a confirmation email shortly.
                      </p>
                      <p className="text-xs opacity-80 lg:text-sm">
                        Web conferencing details will be provided upon
                        confirmation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'CLOSE_CALENDAR' })}
                      className="calendar-day-available big mt-4 w-full rounded-md px-4 py-3 text-xs font-bold text-black uppercase lg:rounded-xl lg:px-6 lg:py-4 lg:text-lg"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="w-full space-y-6">
                    <h3 className="font-grid text-xl font-bold uppercase lg:text-[2rem]">
                      Enter details
                    </h3>

                    {/* Name Input */}
                    <div className="relative">
                      <label
                        htmlFor="name"
                        className="bg-bgPrimary absolute top-0 left-3 -translate-y-1/2 px-2 text-xs lg:text-sm"
                      >
                        name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={state.formData.name}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        required
                        pattern="[a-zA-Z0-9 '-]{2,50}"
                        className={`w-full rounded-sm border bg-transparent px-4 py-3 text-white focus:ring-2 focus:ring-white focus:outline-none lg:rounded-md ${
                          fieldErrors.name ? 'border-red-500' : 'border-white'
                        }`}
                        placeholder="Your name"
                      />
                      {fieldErrors.name && (
                        <p className="mt-1 text-xs text-red-400">
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>

                    {/* Email Input */}
                    <div className="relative">
                      <label
                        htmlFor="email"
                        className="bg-bgPrimary absolute top-0 left-3 -translate-y-1/2 px-2 text-sm"
                      >
                        email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={state.formData.email}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        required
                        pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                        className={`w-full rounded-md border bg-transparent px-4 py-3 text-white focus:ring-2 focus:ring-white focus:outline-none ${
                          fieldErrors.email ? 'border-red-500' : 'border-white'
                        }`}
                      />
                      {fieldErrors.email && (
                        <p className="mt-1 text-xs text-red-400">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Description Input */}
                    <div className="relative">
                      <label
                        htmlFor="description"
                        className="bg-bgPrimary absolute top-0 left-3 -translate-y-1/2 px-2 text-sm"
                      >
                        description <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={state.formData.description}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        required
                        minLength={4}
                        maxLength={500}
                        rows={4}
                        className={`w-full rounded-md border bg-transparent px-4 py-3 text-white focus:ring-2 focus:ring-white focus:outline-none ${
                          fieldErrors.description
                            ? 'border-red-500'
                            : 'border-white'
                        }`}
                      />
                      {fieldErrors.description && (
                        <p className="mt-1 text-xs text-red-400">
                          {fieldErrors.description}
                        </p>
                      )}
                    </div>

                    {/* Hidden Start Time Input (Read-only, auto-filled from previous steps) */}
                    <input
                      type="hidden"
                      id="startTime"
                      name="startTime"
                      value={state.formData.startTime}
                      readOnly
                      required
                      pattern="^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)$"
                    />

                    {/* Hidden Timezone Input (Read-only, auto-filled from previous steps) */}
                    <input
                      type="hidden"
                      id="timezone"
                      name="timezone"
                      value={state.formData.timezone}
                      readOnly
                      required
                      pattern="^[A-Za-z_][A-Za-z0-9_/+-]*$"
                    />

                    {/* TEMPORARY: Read-only inputs for testing (will be removed later) */}
                    <div className="relative opacity-50">
                      <label
                        htmlFor="startTime-test"
                        className="bg-bgPrimary absolute top-0 left-3 -translate-y-1/2 px-2 text-xs text-gray-400"
                      >
                        startTime (readonly - testing)
                      </label>
                      <input
                        type="text"
                        id="startTime-test"
                        name="startTime-test"
                        value={state.formData.startTime}
                        readOnly
                        disabled
                        className="w-full cursor-not-allowed rounded-md border border-gray-600 bg-transparent px-4 py-3 text-sm text-gray-400"
                        title="Start time in RFC3339 format with timezone offset (testing only)"
                      />
                    </div>
                    <div className="relative opacity-50">
                      <label
                        htmlFor="timezone-test"
                        className="bg-bgPrimary absolute top-0 left-3 -translate-y-1/2 px-2 text-xs text-gray-400"
                      >
                        timezone (readonly - testing)
                      </label>
                      <input
                        type="text"
                        id="timezone-test"
                        name="timezone-test"
                        value={state.formData.timezone}
                        readOnly
                        disabled
                        className="w-full cursor-not-allowed rounded-md border border-gray-600 bg-transparent px-4 py-3 text-sm text-gray-400"
                        title="Timezone (testing only)"
                      />
                    </div>

                    {/* Error Message */}
                    {submitError && (
                      <div className="mt-4 rounded-sm border border-red-500 bg-red-500/20 px-4 py-3 text-xs text-red-200 lg:mt-6 lg:rounded-md lg:text-sm">
                        {submitError}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="calendar-day-available big mt-0 w-full rounded-md px-3 py-3 text-sm font-bold text-black uppercase disabled:cursor-not-allowed disabled:opacity-50 lg:mt-4 lg:rounded-xl lg:px-6 lg:py-4 lg:text-lg"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
