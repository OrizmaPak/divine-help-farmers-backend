// **Prompt:**

// I have a system that uses a specific format of codes to represent intervals of time, and I need help validating these codes. The system follows these rules:

// 1. **Days (D1 to D7)**: 
//    - Represent the days of the week. 
//    - D1 is Monday, D7 is Sunday.
//    - If the day code ends with **T** (e.g., **D1T**), it refers to a specific day of the month (1st to 31st). For example, **D1T** means the 1st day of the month, and **D31T** means the 31st day of the month.
//    - Without **T**, the valid range is **D1** to **D7** (days of the week).

// 2. **Weeks (W1 to W5)**:
//    - Represent weeks of the month.
//    - **W1** is the first week, and **W5** is the fifth week (if it exists).
//    - No other week values are valid beyond **W5**.

// 3. **Months (M1, M2, M3, ...)**:
//    - Represent months in intervals.
//    - The number following **M** can be any positive integer (e.g., **M1** for every month, **M3** for every three months, etc.).

// 4. **Years (Y1, Y2, Y3, ...)**:
//    - Represent years in intervals.
//    - The number following **Y** can be any positive integer (e.g., **Y1** for every year, **Y2** for every two years, etc.).

// 5. **Day Intervals (DT1, DT10, DT15, ...)**:
//    - Represent intervals of days.
//    - The number following **DT** can be any positive integer (e.g., **DT10** for every 10 days, **DT15** for every 15 days, etc.).

// 6. **Combinations**:
//    - Allow up to 4 combinations of the above intervals.
//    - Combinations should be separated by a plus sign (+).
//    - For example, "D1 W1 M1+DT10 DT15+D1 W1 M1 Y1".

// ### Invalid Examples:
// - **D44 M1**: Invalid because the day value without **T** can only go up to **D7**.
// - **D9 M1**: Invalid because **D9** is outside the valid day range (D1 to D7).
// - **D2 W6 M3**: Invalid because weeks can only be **W1** to **W5**.
// - **D1 W1 M1 Y0**: Invalid because the year interval must be a positive integer.
// - **DT10 DT15**: Invalid because there is a repetition of code without a plus sign.

// ### Valid Examples:
// - **D1T M1**: Valid, referring to the 1st day of every month.
// - **D1 W1 M1**: Valid, referring to the Monday of the first week of every month.
// - **D3 W3 M2**: Valid, referring to Wednesday of the third week in every two months.
// - **D1T M13**: Valid, referring to the 1st day of every 13 months.
// - **D1 W1 M1 Y1**: Valid, referring to the Monday of the first week of every month, every year.
// - **D7 W5 M6 Y2**: Valid, referring to the Sunday of the fifth week (if it exists) in every six months, every two years.
// - **DT10+DT15**: Valid, referring to every 10 days and then every 15 days.
// - **D1 W1 M1+DT10+DT15+D1 W1 M1 Y1**: Valid, referring to the Monday of the first week of every month, every 10 days, and the Monday of the first week of every month, every year.


// NEW

// Time Interval Coding System: Comprehensive Rules and Guidelines
// Introduction
// This document outlines a specific format of codes used to represent intervals of time. The system is designed to encode complex scheduling patterns succinctly. Below are the detailed rules, components, examples, and validations to ensure accurate code generation and interpretation.

// 1. Code Components
// The coding system is composed of several components, each representing different aspects of time intervals. These components can be combined to form complex scheduling codes.

// A. Days (D1 to D7 and D1T to D31T)
// D1 to D7:

// Purpose: Represent the days of the week.
// Definitions:
// D1: Sunday
// D2: Monday
// D3: Tuesday
// D4: Wednesday
// D5: Thursday
// D6: Friday
// D7: Saturday
// Usage: Indicates a specific weekday.
// D1T to D31T:

// Purpose: Represent specific days of the calendar month.
// Definitions:
// D1T: 1st day of the month
// D2T: 2nd day of the month
// ...
// D31T: 31st day of the month
// Usage: Indicates a specific calendar day regardless of the weekday.
// Important Notes:

// Without the "T" suffix: Codes refer to weekdays.
// With the "T" suffix: Codes refer to specific calendar days.
// Validity:
// D1 to D7: Valid only for weekdays.
// D1T to D31T: Valid for specific days (1-31) of the month.
// B. Week Occurrences (WO1 to WO5)
// WO1 to WO5:
// Purpose: Represent the nth occurrence of a specific weekday within a month.
// Definitions:
// WO1: First occurrence (e.g., first Sunday)
// WO2: Second occurrence (e.g., second Monday)
// WO3: Third occurrence (e.g., third Tuesday)
// WO4: Fourth occurrence (e.g., fourth Wednesday)
// WO5: Fifth occurrence (e.g., fifth Thursday) (if applicable)
// Usage: Specifies the which occurrence of the specified weekday in the month.
// Important Notes:

// WO5 may not exist in all months, depending on the number of weeks.
// Week Occurrence must precede the Month Interval in the code.
// C. Months (M1, M2, M3, ...)
// M1, M2, M3, ...:
// Purpose: Represent monthly intervals.
// Definitions:
// M1: Every month
// M2: Every two months
// M3: Every three months
// ...
// Usage: Specifies the frequency of the event in terms of months.
// Important Notes:

// The number following "M" must be a positive integer (e.g., M1, M5, M12).
// D. Years (Y1, Y2, Y3, ...)
// Y1, Y2, Y3, ...:
// Purpose: Represent yearly intervals.
// Definitions:
// Y1: Every year
// Y2: Every two years
// Y3: Every three years
// ...
// Usage: Specifies the frequency of the event in terms of years.
// Important Notes:

// The number following "Y" must be a positive integer (e.g., Y1, Y5, Y10).
// E. Day Intervals (DT1, DT10, DT15, ...)
// DT1, DT10, DT15, ...:
// Purpose: Represent daily intervals.
// Definitions:
// DT1: Every day
// DT10: Every 10 days
// DT15: Every 15 days
// ...
// Usage: Specifies the frequency of the event in terms of days.
// Important Notes:

// The number following "DT" must be a positive integer (e.g., DT1, DT5, DT30).
// 2. Combination Rules
// Codes can combine multiple components to represent complex scheduling patterns. The following rules govern how components can be combined.

// A. General Combination Rules
// Maximum Combinations:

// Up to 4 combinations are allowed within a single code.
// Separation:

// Plus sign (+) is used to separate different combinations.
// Within a single combination, components are space-separated.
// Order of Components:

// Day Component (D1 to D7 or D1T to D31T) comes first.
// Week Occurrence (WO1 to WO5) comes second (if applicable).
// Month Interval (M1, M2, ...) comes third.
// Year Interval (Y1, Y2, ...) comes fourth (if applicable).
// Day Interval (DT1, DT10, ...) is separate and can be a standalone combination.
// No Repetition Within a Combination:

// A specific component (e.g., D2) cannot be repeated within the same combination.
// Repetitions must be separated by a plus sign (+).
// Self-Containment:

// Each combination must be complete and unambiguous.
// All necessary components must be present to define the interval clearly.
// B. Specific Combination Scenarios
// Combining Weekday and Week Occurrence:

// Example: D3 WO2 M4
// D3: Tuesday
// WO2: Second occurrence
// M4: Every four months
// Meaning: Every second Tuesday of every four months.
// Combining Day Intervals with Other Components:

// Example: DT10 M1 + D1 WO1 M1
// DT10 M1: Every 10 days
// D1 WO1 M1: First Sunday of every month
// Meaning: Every 10 days and the first Sunday of every month.
// Multiple Combinations:

// Example: D2 WO2 M3 + DT15 Y1
// D2 WO2 M3: Every second Monday of every three months
// DT15 Y1: Every 15 days every year
// Meaning: Every second Monday of every three months and every 15 days every year.
// 3. Validation Rules
// To ensure codes are valid and unambiguous, the following validation rules must be adhered to:

// A. Component Validity
// Days (D1 to D7):

// Must be within D1 (Sunday) to D7 (Saturday).
// Cannot exceed this range.
// Specific Days (D1T to D31T):

// Must be within D1T (1st day) to D31T (31st day).
// Cannot exceed this range.
// Week Occurrences (WO1 to WO5):

// Must be within WO1 (first occurrence) to WO5 (fifth occurrence).
// Cannot exceed this range.
// Months (M1, M2, M3, ...):

// The number following "M" must be a positive integer.
// No upper limit on the number.
// Years (Y1, Y2, Y3, ...):

// The number following "Y" must be a positive integer.
// No upper limit on the number.
// Day Intervals (DT1, DT10, DT15, ...):

// The number following "DT" must be a positive integer.
// No upper limit on the number.
// B. Combination Validity
// Maximum of 4 Combinations:

// A single code cannot contain more than 4 separate combinations.
// Separation with Plus Sign (+):

// Different combinations must be separated by a plus sign (+).
// No other separators are allowed.
// No Repetition Within a Combination:

// Duplicate components within a single combination are invalid.
// Example: D2 WO2 M3 D2 is invalid.
// Complete Combinations:

// Each combination must include all necessary components to define the interval.
// Incomplete combinations are invalid.
// Example: D2 M3 is invalid if WO2 is required for clarity.
// 4. Examples
// A. Valid Codes
// Single Combination with Week Occurrence:

// Code: D3 WO2 M4
// Meaning: Every second Tuesday of every four months.
// Multiple Combinations:

// Code: D1T M1 + DT10
// Meaning: The first day of every month and every 10 days.
// Combination with Year Interval:

// Code: D6 WO5 M6 Y2
// Meaning: Every fifth Friday of every six months, every two years.
// Multiple Standalone Combinations:

// Code: DT10 + DT15 + D1 WO1 M1 + D2 WO2 M3
// Meaning: Every 10 days, every 15 days, the first Sunday of every month, and the second Monday of every three months.
// Example for "Every Second Tuesday of Every Three Months":

// Code: D3 WO2 M3
// Meaning: Every second Tuesday of every three months.
// B. Invalid Codes
// Invalid Day Without "T":

// Code: D8 M1
// Reason: D8 exceeds the valid range (D1 to D7).
// Invalid Week Occurrence:

// Code: D2 WO6 M3
// Reason: WO6 exceeds the valid range (WO1 to WO5).
// Zero Year Interval:

// Code: D1 WO1 M1 Y0
// Reason: Y0 is not a positive integer.
// Repetition Without Plus Sign:

// Code: DT10 DT15
// Reason: Repetition of codes without separation by a plus sign.
// Incomplete Combination:

// Code: D2 M3
// Reason: Missing WO2 to specify the second occurrence.
// Week Occurrence Without Day:

// Code: WO2 M3
// Reason: WO2 lacks an associated day component (D1-D7 or D1T-D31T).
// 5. Applying the Rules
// Example 1: "Every Second Tuesday of Every Three Months"
// Code Representation:

// Copy code
// D3 WO2 M3
// Breakdown:

// D3: Tuesday
// WO2: Second occurrence of Tuesday in the month
// M3: Every three months
// Interpretation:

// The event occurs on the second Tuesday of every three months.
// Example 2: "Every Last Friday of Every Six Months"
// Code Representation:

// Copy code
// D6 WO5 M6
// Breakdown:

// D6: Friday
// WO5: Fifth occurrence of Friday in the month (if applicable)
// M6: Every six months
// Interpretation:

// The event occurs on the fifth Friday of every six months, if a fifth Friday exists in that month.
// Example 3: "Every 10 Days and the First Sunday of Every Month"
// Code Representation:

// Copy code
// DT10 + D1 WO1 M1
// Breakdown:

// DT10: Every 10 days
// D1 WO1 M1: First Sunday of every month
// Interpretation:

// The event occurs every 10 days and on the first Sunday of every month.
// Example 4: "Every Third Wednesday, Every 15 Days, and Every Fourth Thursday of Every Two Years"
// Code Representation:

// Copy code
// D4 WO4 M1 Y2 + D3 WO3 M1 Y2 + DT15
// Breakdown:

// D4 WO4 M1 Y2: Every fourth Wednesday of every year, every two years
// D3 WO3 M1 Y2: Every third Tuesday of every year, every two years
// DT15: Every 15 days
// Interpretation:

// The event occurs on the fourth Wednesday and third Tuesday of every year (every two years), and every 15 days.
// 6. Step-by-Step Guide for Code Validation
// To ensure a code is valid, follow these steps:

// Split the Code into Combinations:

// Use the plus sign (+) to separate different combinations.
// Example: D3 WO2 M4 + DT10 splits into D3 WO2 M4 and DT10.
// Validate Each Combination Individually:

// Check Component Order:
// Day (D1-D7 or D1T-D31T) → Week Occurrence (WO1-WO5, if applicable) → Month Interval (M1, M2, ...) → Year Interval (Y1, Y2, ..., if applicable).
// Verify Component Values:
// Ensure all components are within their valid ranges.
// Ensure Completeness:
// For combinations involving weekdays, ensure both Day and Week Occurrence are present.
// Check for Repetitions:

// Ensure no duplicate components exist within the same combination.
// Repeated components must be separated by a plus sign (+).
// Confirm the Number of Combinations:

// Ensure there are no more than 4 combinations.
// Final Validation:

// If all combinations pass the above checks, the code is valid.
// Otherwise, identify and rectify the specific validation errors.
// 7. Additional Considerations
// Handling WO5:

// Not all months have a fifth occurrence of a weekday.
// If WO5 is specified, ensure it exists in the targeted months.
// Combining Multiple Intervals:

// Ensure that combined intervals do not conflict or create ambiguous schedules.
// Clearly define each combination to maintain unambiguity.
// Extensibility:

// The system is designed to be flexible and extensible, allowing for future additions or modifications as needed.
// 8. Summary
// This comprehensive guide establishes a robust framework for representing complex time intervals using a standardized coding system. By adhering to the outlined rules and validation steps, users can generate accurate and unambiguous codes for various scheduling needs.

// Key Takeaways:

// Use "D" codes for specifying weekdays or specific calendar days.
// Incorporate "WO" codes to denote the occurrence of a weekday within a month.
// Define intervals using "M", "Y", and "DT" codes for months, years, and day intervals, respectively.
// Combine components thoughtfully, ensuring clarity and avoiding ambiguity through proper separation and adherence to combination rules.
// Example Code Breakdown for Clarity:

// Code: D3 WO2 M3 + DT15 Y1

// Combination 1: D3 WO2 M3

// D3: Tuesday
// WO2: Second occurrence
// M3: Every three months
// Meaning: Every second Tuesday of every three months.
// Combination 2: DT15 Y1

// DT15: Every 15 days
// Y1: Every year
// Meaning: Every 15 days annually.
// End of Comprehensive Guide


/**
 * Validates a given code based on the specified rules.
 * @param {string} code - The code to validate.
 * @returns {boolean} - Returns true if the code is valid, false otherwise.
 */
function validateCode(code) {
    if(!code) return false
    // Split the code by plus signs to get individual combinations
    const combinations = code.split('+');

    // Check if the number of combinations exceeds 4
    if (combinations.length > 14) {
        return false; // Invalid: More than 4 combinations
    }

    // Loop through each combination
    for (let combination of combinations) {
        // Trim and split the combination by spaces to get individual parts
        const parts = combination.trim().split(/\s+/);

        // Initialize flags to track component presence
        let hasDayComponent = false;
        let hasWeekOccurrence = false;
        let hasMonthInterval = false;
        let hasYearInterval = false;
        let hasDayInterval = false;

        // Loop through each part of the combination
        for (let part of parts) {
            if (part.startsWith('D')) {
                // Handle day codes
                const isT = part.endsWith('T');
                const dayNumberStr = part.substring(1, part.length - (isT ? 1 : 0));
                const dayNumber = parseInt(dayNumberStr, 10);

                // If T is present, day must be between 1 and 31
                // Else, day must be between 1 and 7
                if (
                    isNaN(dayNumber) ||
                    (isT ? dayNumber < 1 || dayNumber > 31 : dayNumber < 1 || dayNumber > 7)
                ) {
                    return false; // Invalid day
                }
                // Check for unrecognized characters
                if (part.length > (isT ? 4 : 3)) {
                    return false; // Unrecognized characters
                }
                hasDayComponent = true;
            } else if (part.startsWith('WO')) {
                // Handle week occurrence codes
                const weekNumberStr = part.substring(2);
                const weekNumber = parseInt(weekNumberStr, 10);
                if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 5) {
                    return false; // Invalid week occurrence
                }
                hasWeekOccurrence = true;
            } else if (part.startsWith('M')) {
                // Handle month codes
                const monthNumber = parseInt(part.substring(1), 10);
                if (isNaN(monthNumber) || monthNumber < 1) {
                    return false; // Invalid month
                }
                hasMonthInterval = true;
            } else if (part.startsWith('Y')) {
                // Handle year codes
                const yearNumber = parseInt(part.substring(1), 10);
                if (isNaN(yearNumber) || yearNumber < 1) {
                    return false; // Invalid year
                }
                hasYearInterval = true;
            } else if (part.startsWith('DT')) {
                // Handle day interval codes
                const dayInterval = parseInt(part.substring(2), 10);
                if (isNaN(dayInterval) || dayInterval < 1) {
                    return false; // Invalid day interval
                }
                hasDayInterval = true;
            } else {
                return false; // Unrecognized part
            }
        }

        // Validate the order of components
        if (hasWeekOccurrence && !hasDayComponent) {
            return false; // Invalid: Week occurrence without a day component
        }

        // Ensure no repetition within a combination
        const uniqueParts = new Set(parts);
        if (uniqueParts.size !== parts.length) {
            return false; // Invalid: Repetition within a combination
        }
    }

    // If all parts are valid, return true
    return true;
}

/**
 * Generates the last date, second-to-last date, and next date based on the code.
 * @param {string} code - The code specifying the intervals.
 * @returns {object} - An object containing the dates in ISO format.
 */
/* Start of Selection */
function generateDates(code) {
    // Helper function to get the nth occurrence of a weekday in a specific month and year
    function getNthWeekday(year, month, weekday, n) {
        const firstDay = new Date(year, month, 1);
        let firstWeekday = firstDay.getDay(); // 0 (Sunday) to 6 (Saturday)

        // Calculate the date of the first occurrence of the weekday
        let day = 1 + ((weekday - firstWeekday + 7) % 7);
        day += (n - 1) * 7;

        const date = new Date(year, month, day);
        // Check if the calculated date is still within the same month
        if (date.getMonth() !== month) {
            return null; // The nth occurrence does not exist in this month
        }
        return date;
    }

    // Helper function to check if a specific day exists in a month
    function isValidDate(year, month, day) {
        const date = new Date(year, month, day);
        return date.getMonth() === month && date.getDate() === day;
    }

    // Get the current date
    const now = new Date();

    // Split the code into combinations separated by '+'
    const combinations = code.split('+').map(combo => combo.trim());

    // Arrays to store all calculated dates from combinations
    const nextDates = [];
    const lastDates = [];
    const secondToLastDates = [];

    // Loop through each combination
    for (let combination of combinations) {
        const parts = combination.split(/\s+/);

        // Initialize variables for each combination
        let dayCode = null;
        let weekOccurrence = null;
        let monthInterval = 1; // Default to every month
        let yearInterval = 1;  // Default to every year
        let dayInterval = null;

        // Parse each part of the combination
        for (let part of parts) {
            if (part.startsWith('DT') && /^DT\d+$/.test(part)) {
                // Day Interval (e.g., DT10)
                dayInterval = parseInt(part.substring(2), 10);
            } else if (part.startsWith('Y') && /^Y\d+$/.test(part)) {
                // Year Interval (e.g., Y2)
                yearInterval = parseInt(part.substring(1), 10);
            } else if (part.startsWith('M') && /^M\d+$/.test(part)) {
                // Month Interval (e.g., M3)
                monthInterval = parseInt(part.substring(1), 10);
            } else if (part.startsWith('WO') && /^WO[1-5]$/.test(part)) {
                // Week Occurrence (e.g., WO2)
                weekOccurrence = parseInt(part.substring(2), 10);
            } else if (part.startsWith('D') && part.endsWith('T') && /^D\d{1,2}T$/.test(part)) {
                // Specific day of the month (e.g., D15T)
                dayCode = part;
            } else if (part.startsWith('D') && /^D[1-7]$/.test(part)) {
                // Weekday (e.g., D2 for Monday)
                dayCode = part;
            } else {
                // Invalid component
                throw new Error(`Invalid code component: ${part}`);
            }
        }

        // Calculate dates based on the combination
        if (dayInterval !== null) {
            // Handle Day Intervals (DT codes)
            const nextDate = new Date(now);
            nextDate.setDate(nextDate.getDate() + dayInterval * Math.ceil((1) / dayInterval));

            const lastDate = new Date(now);
            lastDate.setDate(now.getDate() - dayInterval * Math.floor(1 / dayInterval));

            const secondToLastDate = new Date(lastDate);
            secondToLastDate.setDate(lastDate.getDate() - dayInterval);

            nextDates.push(nextDate);
            lastDates.push(lastDate);
            secondToLastDates.push(secondToLastDate);
        } else if (dayCode !== null) {
            if (dayCode.endsWith('T')) {
                // Specific day of the month (D1T to D31T)
                const dayOfMonth = parseInt(dayCode.substring(1, dayCode.length - 1), 10);
                let targetMonth = now.getMonth();
                let targetYear = now.getFullYear();

                let targetDate = new Date(targetYear, targetMonth, dayOfMonth);
                if (targetDate <= now) {
                    // Move to the next interval
                    targetMonth += monthInterval;
                    targetYear += Math.floor(targetMonth / 12);
                    targetMonth = targetMonth % 12;
                    targetDate = new Date(targetYear, targetMonth, dayOfMonth);
                }

                // Validate the date
                if (!isValidDate(targetDate.getFullYear(), targetDate.getMonth(), dayOfMonth)) {
                    // If the day does not exist in the month, set to last day of the month
                    targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
                }

                // Calculate last and second to last dates based on monthInterval and yearInterval
                const lastDate = new Date(targetDate);
                lastDate.setMonth(targetDate.getMonth() - monthInterval);
                if (yearInterval > 1) {
                    lastDate.setFullYear(lastDate.getFullYear() - yearInterval);
                }

                const secondToLastDate = new Date(lastDate);
                secondToLastDate.setMonth(lastDate.getMonth() - monthInterval);
                if (yearInterval > 1) {
                    secondToLastDate.setFullYear(secondToLastDate.getFullYear() - yearInterval);
                }

                const nextDate = new Date(targetDate);
                if (yearInterval > 1) {
                    nextDate.setFullYear(nextDate.getFullYear() + yearInterval);
                }

                nextDates.push(nextDate);
                lastDates.push(lastDate);
                secondToLastDates.push(secondToLastDate);
            } else {
                // Weekday with optional Week Occurrence (e.g., D2 WO2)
                if (weekOccurrence === null) {
                    // If no week occurrence is specified, default to the first occurrence
                    weekOccurrence = 1;
                }

                // Map D1-D7 to JavaScript's getDay() where 0=Sunday, 1=Monday, ..., 6=Saturday
                const dayMapping = {
                    'D1': 0, // Sunday
                    'D2': 1, // Monday
                    'D3': 2, // Tuesday
                    'D4': 3, // Wednesday
                    'D5': 4, // Thursday
                    'D6': 5, // Friday
                    'D7': 6  // Saturday
                };
                const weekday = dayMapping[dayCode];
                if (weekday === undefined) {
                    throw new Error(`Invalid weekday code: ${dayCode}`);
                }

                let targetMonth = now.getMonth();
                let targetYear = now.getFullYear();

                // Calculate the target date
                let occurrenceDate = getNthWeekday(targetYear, targetMonth, weekday, weekOccurrence);
                if (occurrenceDate === null || occurrenceDate <= now) {
                    // Move to the next interval
                    targetMonth += monthInterval;
                    targetYear += Math.floor(targetMonth / 12);
                    targetMonth = targetMonth % 12;
                    occurrenceDate = getNthWeekday(targetYear, targetMonth, weekday, weekOccurrence);
                    if (occurrenceDate === null) {
                        // Find the last possible occurrence in the month
                        for (let tempN = 5; tempN >= 1; tempN--) {
                            let tempDate = getNthWeekday(targetYear, targetMonth, weekday, tempN);
                            if (tempDate !== null) {
                                occurrenceDate = tempDate;
                                break;
                            }
                        }
                    }
                }

                if (occurrenceDate !== null) {
                    // Adjust for year interval
                    if (yearInterval > 1) {
                        occurrenceDate.setFullYear(occurrenceDate.getFullYear() + yearInterval);
                    }

                    // Calculate last and second to last dates
                    let lastOccurrenceMonth = targetMonth - monthInterval;
                    let lastOccurrenceYear = targetYear;
                    if (lastOccurrenceMonth < 0) {
                        lastOccurrenceYear -= 1;
                        lastOccurrenceMonth += 12;
                    }

                    let lastOccurrenceDate = getNthWeekday(lastOccurrenceYear, lastOccurrenceMonth, weekday, weekOccurrence);
                    if (lastOccurrenceDate === null) {
                        // Find the last possible occurrence in the month
                        for (let tempN = 5; tempN >= 1; tempN--) {
                            let tempDate = getNthWeekday(lastOccurrenceYear, lastOccurrenceMonth, weekday, tempN);
                            if (tempDate !== null) {
                                lastOccurrenceDate = tempDate;
                                break;
                            }
                        }
                    }

                    if (lastOccurrenceDate !== null) {
                        if (yearInterval > 1) {
                            lastOccurrenceDate.setFullYear(lastOccurrenceDate.getFullYear() - yearInterval);
                        }
                        lastDates.push(lastOccurrenceDate);
                    }

                    let secondLastOccurrenceMonth = lastOccurrenceMonth - monthInterval;
                    let secondLastOccurrenceYear = lastOccurrenceYear;
                    if (secondLastOccurrenceMonth < 0) {
                        secondLastOccurrenceYear -= 1;
                        secondLastOccurrenceMonth += 12;
                    }

                    let secondLastOccurrenceDate = getNthWeekday(secondLastOccurrenceYear, secondLastOccurrenceMonth, weekday, weekOccurrence);
                    if (secondLastOccurrenceDate === null) {
                        // Find the last possible occurrence in the month
                        for (let tempN = 5; tempN >= 1; tempN--) {
                            let tempDate = getNthWeekday(secondLastOccurrenceYear, secondLastOccurrenceMonth, weekday, tempN);
                            if (tempDate !== null) {
                                secondLastOccurrenceDate = tempDate;
                                break;
                            }
                        }
                    }

                    if (secondLastOccurrenceDate !== null) {
                        if (yearInterval > 1) {
                            secondLastOccurrenceDate.setFullYear(secondLastOccurrenceDate.getFullYear() - yearInterval);
                        }
                        secondToLastDates.push(secondLastOccurrenceDate);
                    }

                    nextDates.push(occurrenceDate);
                }
            }
        }

        // Determine the earliest next date
        const nextDate = nextDates.reduce((earliest, current) => {
            return (!earliest || current < earliest) ? current : earliest;
        }, null);

        // Determine the latest last date
        const lastDate = lastDates.reduce((latest, current) => {
            return (!latest || current > latest) ? current : latest;
        }, null);

        // Determine the latest second to last date
        const secondToLastDate = secondToLastDates.reduce((latest, current) => {
            return (!latest || current > latest) ? current : latest;
        }, null);

        // Function to format dates to YYYY-MM-DD
        function formatDate(date) {
            if (!(date instanceof Date) || isNaN(date)) return null;
            const year = date.getFullYear();
            const month = (`0${date.getMonth() + 1}`).slice(-2);
            const day = (`0${date.getDate()}`).slice(-2);
            return `${year}-${month}-${day}`;
        }

        // Format the dates
        const formattedSecondToLastDate = secondToLastDate ? formatDate(secondToLastDate) : null;
        const formattedLastDate = lastDate ? formatDate(lastDate) : null;
        const formattedNextDate = nextDate ? formatDate(nextDate) : null;

        // Return the dates in ISO format (YYYY-MM-DD)
        return {
            secondToLastDate: formattedSecondToLastDate,
            lastDate: formattedLastDate,
            nextDate: formattedNextDate,
        };
    }
    }
/* End of Selection */


/**
 * Generates the next N dates based on the code.
 * @param {string} code - The code specifying the intervals.
 * @param {number} numberOfDates - The number of dates to generate.
 * @param {Date} [currentDate=new Date()] - The starting date.
 * @returns {string[]} - An array of dates in ISO format.
 */
function generateNextDates(code, numberOfDates, currentDateInput = new Date()) {
    // Ensure currentDate is a Date object
    let currentDate;
    if (currentDateInput instanceof Date) {
        currentDate = new Date(currentDateInput);
    } else {
        currentDate = new Date(currentDateInput);
        if (isNaN(currentDate)) {
            throw new Error('Invalid currentDate provided. Please provide a valid date.');
        }
    }

    console.log("Code:", code, "Number of Dates:", numberOfDates, "Current Date:", currentDate.toISOString().split('T')[0]);

    // Initialize an empty array to hold the generated dates
    const dates = [];

    // Helper function to find the nth occurrence of a weekday in a given month and year
    function getNthWeekdayOfMonth(year, month, weekday, n) {
        const firstDay = new Date(year, month, 1);
        let firstWeekday = firstDay.getDay(); // 0 (Sunday) to 6 (Saturday)
        // Calculate the date of the first occurrence of the weekday
        let day = 1 + ((7 + weekday - firstWeekday) % 7) + (n - 1) * 7;
        // Check if the day exists in the month
        if (day > new Date(year, month + 1, 0).getDate()) {
            return null; // The nth weekday does not exist in this month
        }
        return new Date(year, month, day);
    }

    // Helper function to find the last occurrence of a weekday in a given month and year
    function getLastWeekdayOfMonth(year, month, weekday) {
        const lastDayOfMonth = new Date(year, month + 1, 0); // Last day of the month
        let lastWeekday = lastDayOfMonth.getDay();
        let day = lastDayOfMonth.getDate() - ((lastWeekday - weekday + 7) % 7);
        return new Date(year, month, day);
    }

    // Parse the code into separate combinations
    const combinations = code.split('+').map(combo => combo.trim());

    // Function to generate the next date for a single combination
    function getNextDateForCombination(combination, fromDate) {
        const parts = combination.split(/\s+/);
        let tempDate = new Date(fromDate);

        let dayCode = null;
        let weekOccurrence = null;
        let monthInterval = 1; // Default is every month
        let yearInterval = 1;  // Default is every year

        // Parse each part of the combination
        for (const part of parts) {
            if (part.startsWith('DT')) {
                // Handle day intervals
                const dayInterval = parseInt(part.substring(2), 10);
                if (isNaN(dayInterval) || dayInterval < 1) {
                    throw new Error(`Invalid day interval in part "${part}"`);
                }
                tempDate.setDate(tempDate.getDate() + dayInterval);
            } else if (part.startsWith('D')) {
                // Handle day codes
                const isT = part.endsWith('T');
                let dayNumber;
                if (isT) {
                    dayNumber = parseInt(part.substring(1, part.length - 1), 10);
                    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 31) {
                        throw new Error(`Invalid specific day in part "${part}"`);
                    }
                    dayCode = { type: 'specific', day: dayNumber };
                } else {
                    dayNumber = parseInt(part.substring(1), 10);
                    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 7) {
                        throw new Error(`Invalid weekday in part "${part}"`);
                    }
                    const targetDay = dayNumber - 1; // D1=0 (Sunday) to D7=6 (Saturday)
                    dayCode = { type: 'weekday', day: targetDay };
                }
            } else if (part.startsWith('WO')) {
                // Handle week occurrences
                const weekNum = parseInt(part.substring(2), 10);
                if (isNaN(weekNum) || weekNum < 1 || weekNum > 5) {
                    throw new Error(`Invalid week occurrence in part "${part}"`);
                }
                weekOccurrence = weekNum;
            } else if (part.startsWith('M')) {
                // Handle month intervals
                const mInterval = parseInt(part.substring(1), 10);
                if (isNaN(mInterval) || mInterval < 1) {
                    throw new Error(`Invalid month interval in part "${part}"`);
                }
                monthInterval = mInterval;
            } else if (part.startsWith('Y')) {
                // Handle year intervals
                const yInterval = parseInt(part.substring(1), 10);
                if (isNaN(yInterval) || yInterval < 1) {
                    throw new Error(`Invalid year interval in part "${part}"`);
                }
                yearInterval = yInterval;
            } else {
                throw new Error(`Unknown code part "${part}"`);
            }
        }

        // Now, determine the next date based on the parsed components
        if (dayCode) {
            if (dayCode.type === 'specific') {
                // Specific day of the month
                let nextMonth = tempDate.getMonth();
                let nextYear = tempDate.getFullYear();

                // If the specific day has already passed this month, move to the next interval
                if (tempDate.getDate() > dayCode.day) {
                    nextMonth += monthInterval;
                    if (nextMonth > 11) {
                        nextYear += Math.floor(nextMonth / 12);
                        nextMonth = nextMonth % 12;
                    }
                }

                // Calculate the target date
                const targetDate = new Date(nextYear, nextMonth, dayCode.day);

                // Handle invalid dates (e.g., February 30)
                if (targetDate.getMonth() !== nextMonth) {
                    throw new Error(`Invalid date: ${targetDate.toISOString().split('T')[0]}`);
                }

                // Apply year interval
                targetDate.setFullYear(targetDate.getFullYear() + (yearInterval - 1));

                return targetDate;
            } else if (dayCode.type === 'weekday') {
                // Weekday with week occurrence
                if (!weekOccurrence) {
                    // If no week occurrence is specified, find the next occurrence of the weekday
                    let diff = dayCode.day - tempDate.getDay();
                    if (diff <= 0) {
                        diff += 7;
                    }
                    tempDate.setDate(tempDate.getDate() + diff);
                    return tempDate;
                } else {
                    // Find the nth occurrence of the weekday
                    const year = tempDate.getFullYear();
                    const month = tempDate.getMonth();

                    let targetDate = getNthWeekdayOfMonth(year, month, dayCode.day, weekOccurrence);

                    if (!targetDate || targetDate <= tempDate) {
                        // Move to the next interval
                        let nextMonth = month + monthInterval;
                        let nextYear = year;
                        if (nextMonth > 11) {
                            nextYear += Math.floor(nextMonth / 12);
                            nextMonth = nextMonth % 12;
                        }

                        // Apply year interval
                        nextYear += Math.floor(nextMonth / 12) * yearInterval;
                        nextMonth = nextMonth % 12;

                        // Recalculate targetDate
                        targetDate = getNthWeekdayOfMonth(nextYear, nextMonth, dayCode.day, weekOccurrence);

                        if (!targetDate) {
                            throw new Error(`The ${weekOccurrence} occurrence of weekday ${dayCode.day} does not exist in month ${nextMonth + 1}, ${nextYear}.`);
                        }
                    }

                    return targetDate;
                }
            }
        }

        // If only month and year intervals are specified without day codes
        // (Though according to the rules, this should be invalid)
        throw new Error(`Incomplete combination: "${combination}". Day component is missing.`);
    }

    // Initialize an array to keep track of the next dates for each combination
    const nextDatesPerCombination = combinations.map(combo => getNextDateForCombination(combo, currentDate));

    while (dates.length < numberOfDates) {
        // Find the earliest next date among all combinations
        let earliestDate = null;
        let earliestIndex = -1;

        for (let i = 0; i < nextDatesPerCombination.length; i++) {
            const date = nextDatesPerCombination[i];
            if (!earliestDate || date < earliestDate) {
                earliestDate = date;
                earliestIndex = i;
            }
        }

        if (earliestDate && earliestDate > currentDate) {
            dates.push(earliestDate.toISOString().split('T')[0]);

            // Update the next date for this combination
            const combo = combinations[earliestIndex];
            nextDatesPerCombination[earliestIndex] = getNextDateForCombination(combo, earliestDate);
            currentDate = new Date(earliestDate);
        } else {
            // If no valid next date is found, break to prevent infinite loop
            break;
        }
    }

    return dates;
}


/**
 * Calculates the transaction period (start and end dates) based on the code and a reference date.
 * @param {string} code - The code specifying the intervals.
 * @param {string} date - The reference date in ISO format (YYYY-MM-DD).
 * @returns {object} - An object containing the startDate and endDate in ISO format.
 */
function getTransactionPeriod(code, date) {
    console.log(code, date);
    
    // Parse the reference date
    const referenceDate = new Date(date);
    const combinations = code.split('+');

    // Initialize startDate based on referenceDate
    let startDate = new Date(referenceDate);
    
    // Initialize interval variables
    let monthInterval = 0;
    let yearInterval = 0;
    let dayInterval = 0;

    // Process each combination to set startDate and collect intervals
    for (const combination of combinations) {
        const parts = combination.trim().split(/\s+/);

        // Process each part of the combination
        for (const part of parts) {
            if (part.startsWith('D')) {
                // Handle day codes (day of the week)
                const isT = part.endsWith('T');
                const dayNumber = parseInt(part.substring(1, part.length - (isT ? 1 : 0)), 10);

                if (isT) {
                    // Specific day of the month
                    startDate.setDate(dayNumber);
                } else {
                    // Day of the week
                    const targetDay = dayNumber === 7 ? 0 : dayNumber; // Adjust for Sunday
                    let diff = targetDay - startDate.getDay();
                    if (diff <= 0) {
                        diff += 7;
                    }
                    startDate.setDate(startDate.getDate() + diff);
                }
            } else if (part.startsWith('W')) {
                // Handle week codes
                let weekNumber = parseInt(part.substring(1), 10);
                const year = startDate.getFullYear();
                const month = startDate.getMonth();

                const daysInMonth = new Date(year, month + 1, 0).getDate();

                // Adjust week number if W5 does not exist
                if (weekNumber === 5 && daysInMonth < 29) {
                    weekNumber = 4;
                } else if (weekNumber === 1 && daysInMonth < 7) {
                    weekNumber = 2;
                }

                // Calculate the date corresponding to the start of the week
                const weekStartDate = new Date(year, month, (weekNumber - 1) * 7 + 1);

                startDate = new Date(weekStartDate);
            } else if (part.startsWith('M')) {
                // Collect month intervals
                monthInterval += parseInt(part.substring(1), 10);
            } else if (part.startsWith('Y')) {
                // Collect year intervals
                yearInterval += parseInt(part.substring(1), 10);
            } else if (part.startsWith('DT')) {
                // Collect day intervals
                dayInterval += parseInt(part.substring(2), 10);
            }
        }
    }

    // Calculate endDate based on collected intervals
    let endDate = new Date(startDate);
    if (yearInterval !== 0) {
        endDate.setFullYear(endDate.getFullYear() + yearInterval);
    }
    if (monthInterval !== 0) {
        endDate.setMonth(endDate.getMonth() + monthInterval);
    }
    if (dayInterval !== 0) {
        endDate.setDate(endDate.getDate() + dayInterval);
    }

    // Return the transaction period in ISO format
    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
    };
}

// Export the functions for use in other modules
module.exports = {
    validateCode,
    generateDates,
    generateNextDates,
    getTransactionPeriod,
};
