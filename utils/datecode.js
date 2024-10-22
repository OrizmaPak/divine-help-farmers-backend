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


/**
 * Validates a given code based on the specified rules.
 * @param {string} code - The code to validate.
 * @returns {boolean} - Returns true if the code is valid, false otherwise.
 */
function validateCode(code) {
    // Split the code by plus signs to get individual combinations
    const combinations = code.split('+');

    // Loop through each combination
    for (let combination of combinations) {
        // Trim and split the combination by spaces to get individual parts
        const parts = combination.trim().split(/\s+/);

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
            } else if (part.startsWith('W')) {
                // Handle week codes
                const weekNumberStr = part.substring(1);
                const weekNumber = parseInt(weekNumberStr, 10);
                if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 5) {
                    return false; // Invalid week
                }
            } else if (part.startsWith('M')) {
                // Handle month codes
                const monthNumber = parseInt(part.substring(1), 10);
                if (isNaN(monthNumber) || monthNumber < 1) {
                    return false; // Invalid month
                }
            } else if (part.startsWith('Y')) {
                // Handle year codes
                const yearNumber = parseInt(part.substring(1), 10);
                if (isNaN(yearNumber) || yearNumber < 1) {
                    return false; // Invalid year
                }
            } else if (part.startsWith('DT')) {
                // Handle day interval codes
                const dayInterval = parseInt(part.substring(2), 10);
                if (isNaN(dayInterval) || dayInterval < 1) {
                    return false; // Invalid day interval
                }
            } else {
                return false; // Unrecognized part
            }
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
function generateDates(code) {

    // Get the current date
    const now = new Date();

    // Split the code into combinations separated by '+'
    const combinations = code.split('+');

    // Initialize dates to current date
    let lastDate = new Date(now);
    let secondToLastDate = new Date(now);
    let nextDate = new Date(now);

    // Loop through each combination
    for (let combination of combinations) {
        const parts = combination.trim().split(/\s+/);

        // Process each part of the combination
        for (let part of parts) {
            if (part.startsWith('D')) {
                // Handle day codes
                const isT = part.endsWith('T');
                const dayNumber = parseInt(part.substring(1, part.length - (isT ? 1 : 0)), 10);

                if (isT) {
                    // Specific day of the month (e.g., D1T)
                    lastDate.setDate(dayNumber);
                    secondToLastDate.setDate(dayNumber);
                    nextDate.setDate(dayNumber);

                    // Adjust months for last and second-to-last dates
                    lastDate.setMonth(now.getMonth() - 1);
                    secondToLastDate.setMonth(now.getMonth() - 2);

                    // If the day does not exist in the month (e.g., Feb 30), adjust
                    if (lastDate.getMonth() !== now.getMonth() - 1) {
                        lastDate.setDate(0); // Set to last day of previous month
                    }
                    if (secondToLastDate.getMonth() !== now.getMonth() - 2) {
                        secondToLastDate.setDate(0);
                    }
                } else {
                    // Day of the week (e.g., D1)
                    const targetDay = dayNumber === 7 ? 0 : dayNumber; // Sunday is 0
                    const currentDay = now.getDay();

                    // Calculate previous occurrences
                    let diffLast = currentDay - targetDay;
                    if (diffLast <= 0) {
                        diffLast += 7;
                    }
                    lastDate.setDate(now.getDate() - diffLast);

                    let diffSecondLast = diffLast + 7;
                    secondToLastDate.setDate(now.getDate() - diffSecondLast);

                    // Calculate next occurrence
                    let diffNext = targetDay - currentDay;
                    if (diffNext <= 0) {
                        diffNext += 7;
                    }
                    nextDate.setDate(now.getDate() + diffNext);
                }
            } else if (part.startsWith('W')) {
                // Handle week codes
                let weekNumber = parseInt(part.substring(1), 10);
                const year = now.getFullYear();
                const month = now.getMonth();

                // Get the number of days in the month
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                // Adjust week number if W5 does not exist
                if (weekNumber === 5 && daysInMonth < 29) {
                    // W5 does not exist, use W4
                    weekNumber = 4;
                } else if (weekNumber === 1 && daysInMonth < 7) {
                    // W1 does not have expected dates, use W2
                    weekNumber = 2;
                }

                // Calculate the first day of the week
                const firstDayOfWeek = new Date(year, month, (weekNumber - 1) * 7 + 1);

                // Adjust dates for last and second-to-last occurrences
                lastDate = new Date(firstDayOfWeek);
                lastDate.setMonth(month - 1); // Previous month

                secondToLastDate = new Date(firstDayOfWeek);
                secondToLastDate.setMonth(month - 2); // Two months ago

                nextDate = new Date(firstDayOfWeek);
                if (nextDate <= now) {
                    // If the date has already passed, move to next month
                    nextDate.setMonth(month + 1);
                }
            } else if (part.startsWith('M')) {
                // Handle month intervals
                const monthInterval = parseInt(part.substring(1), 10);

                // Adjust months for last and second-to-last dates
                lastDate.setMonth(lastDate.getMonth() - monthInterval);
                secondToLastDate.setMonth(secondToLastDate.getMonth() - 2 * monthInterval);

                // Adjust month for next date
                nextDate.setMonth(nextDate.getMonth() + monthInterval);
            } else if (part.startsWith('Y')) {
                // Handle year intervals
                const yearInterval = parseInt(part.substring(1), 10);

                // Adjust years for last and second-to-last dates
                lastDate.setFullYear(lastDate.getFullYear() - yearInterval);
                secondToLastDate.setFullYear(secondToLastDate.getFullYear() - 2 * yearInterval);

                // Adjust year for next date
                nextDate.setFullYear(nextDate.getFullYear() + yearInterval);
            } else if (part.startsWith('DT')) {
                // Handle day intervals
                const dayInterval = parseInt(part.substring(2), 10);

                // Adjust dates for last and second-to-last occurrences
                lastDate.setDate(lastDate.getDate() - dayInterval);
                secondToLastDate.setDate(secondToLastDate.getDate() - 2 * dayInterval);

                // Adjust date for next occurrence
                nextDate.setDate(nextDate.getDate() + dayInterval);
            }
        }
    }

    // Return the dates in ISO format (YYYY-MM-DD)
    return {
        secondToLastDate: secondToLastDate.toISOString().split('T')[0],
        lastDate: lastDate.toISOString().split('T')[0],
        nextDate: nextDate.toISOString().split('T')[0],
    };
}

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

    // Keep generating dates until we have the required number
    while (dates.length < numberOfDates) {
        let earliestNextDate = null;
        const combinations = code.split('+');

        // Loop through each combination to find the next date
        for (const combination of combinations) {
            const parts = combination.trim().split(/\s+/);

            // Start from the current date
            let nextDate = new Date(currentDate);

            // Process each part of the combination
            for (const part of parts) {
                if (part.startsWith('DT')) {
                    // Handle day intervals first to avoid conflict with 'D'
                    const dayInterval = parseInt(part.substring(2), 10);
                    if (isNaN(dayInterval)) {
                        throw new Error(`Invalid day interval in part "${part}"`);
                    }
                    const diffDays = Math.ceil((currentDate - nextDate) / (24 * 60 * 60 * 1000));
                    const daysToAdd = Math.ceil(diffDays / dayInterval) * dayInterval;
                    nextDate.setDate(nextDate.getDate() + daysToAdd);
                } else if (part.startsWith('D')) {
                    // Handle day codes
                    const isT = part.endsWith('T');
                    const dayNumber = parseInt(part.substring(1, part.length - (isT ? 1 : 0)), 10);

                    if (isT) {
                        // Specific day of the month
                        if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 31) {
                            throw new Error(`Invalid day number in part "${part}"`);
                        }
                        nextDate.setDate(dayNumber);
                        if (nextDate <= currentDate) {
                            // Move to next month if date has passed
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            nextDate.setDate(dayNumber);
                        }
                    } else {
                        // Day of the week
                        if (isNaN(dayNumber) || dayNumber < 0 || dayNumber > 7) {
                            throw new Error(`Invalid day of week in part "${part}"`);
                        }
                        const targetDay = dayNumber === 7 ? 0 : dayNumber; // Adjust for Sunday
                        let diff = targetDay - nextDate.getDay();
                        if (diff <= 0) {
                            diff += 7;
                        }
                        nextDate.setDate(nextDate.getDate() + diff);
                    }
                } else if (part.startsWith('W')) {
                    // Handle week codes
                    let weekNumber = parseInt(part.substring(1), 10);
                    if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 5) {
                        throw new Error(`Invalid week number in part "${part}"`);
                    }
                    const year = nextDate.getFullYear();
                    const month = nextDate.getMonth();

                    const daysInMonth = new Date(year, month + 1, 0).getDate();

                    // Adjust week number if W5 does not exist
                    if (weekNumber === 5 && daysInMonth < 29) {
                        weekNumber = 4;
                    } else if (weekNumber === 1 && daysInMonth < 7) {
                        weekNumber = 2;
                    }

                    // Calculate the date corresponding to the start of the week
                    const weekStartDate = new Date(year, month, (weekNumber - 1) * 7 + 1);

                    if (weekStartDate <= currentDate) {
                        // Move to next month if date has passed
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        // Recalculate year and month
                        const newYear = nextDate.getFullYear();
                        const newMonth = nextDate.getMonth();
                        const newDaysInMonth = new Date(newYear, newMonth + 1, 0).getDate();

                        // Adjust week number again if necessary
                        if (weekNumber === 5 && newDaysInMonth < 29) {
                            weekNumber = 4;
                        } else if (weekNumber === 1 && newDaysInMonth < 7) {
                            weekNumber = 2;
                        }

                        nextDate = new Date(newYear, newMonth, (weekNumber - 1) * 7 + 1);
                    } else {
                        nextDate = weekStartDate;
                    }
                } else if (part.startsWith('M')) {
                    // Handle month intervals
                    const monthInterval = parseInt(part.substring(1), 10);
                    if (isNaN(monthInterval) || monthInterval < 1) {
                        throw new Error(`Invalid month interval in part "${part}"`);
                    }
                    while (nextDate <= currentDate) {
                        nextDate.setMonth(nextDate.getMonth() + monthInterval);
                    }
                } else if (part.startsWith('Y')) {
                    // Handle year intervals
                    const yearInterval = parseInt(part.substring(1), 10);
                    if (isNaN(yearInterval) || yearInterval < 1) {
                        throw new Error(`Invalid year interval in part "${part}"`);
                    }
                    while (nextDate <= currentDate) {
                        nextDate.setFullYear(nextDate.getFullYear() + yearInterval);
                    }
                } else {
                    throw new Error(`Unknown code part "${part}"`);
                }
            }

            // Update earliestNextDate
            if (!earliestNextDate || nextDate < earliestNextDate) {
                earliestNextDate = nextDate;
            }
        }

        if (earliestNextDate && earliestNextDate > currentDate) {
            dates.push(earliestNextDate.toISOString().split('T')[0]);
            // Move currentDate forward to avoid infinite loops
            currentDate = new Date(earliestNextDate);
            currentDate.setDate(currentDate.getDate() + 1);
        } else {
            // No more dates can be generated
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



// O1-PREVIEW PROMPT 
// **Prompt:**
//
// I have a system that uses a specific format of codes to represent intervals of time, and I need help validating these codes. The system follows these rules:
//
// 1. **Days (D1 to D7 or D1T to D31T)**: 
//    - Represent days of the week or specific days of the month.
//    - **D1** is Monday, **D7** is Sunday.
//    - If the day code ends with **T** (e.g., **D1T**), it refers to a specific day of the month (1st to 31st).
//      - Example: **D1T** means the 1st day of the month, **D31T** means the 31st day of the month.
//    - Without **T**, the valid range is **D1** to **D7** (days of the week).
//
// 2. **Weeks (W1 to W5)**:
//    - Represent weeks of the month.
//    - **W1** is the first week, **W5** is the fifth week (if it exists).
//    - **Special Logic for Weeks**:
//      - If **W5** is specified but does not exist in a month, the system should use **W4** instead.
//      - If **W1** is specified but does not have any dates (e.g., the first week is incomplete), the system should use **W2** instead.
//    - No week values beyond **W5** are valid.
//
// 3. **Months (M1, M2, M3, ...)**:
//    - Represent months in intervals.
//    - The number following **M** can be any positive integer.
//      - Example: **M1** for every month, **M3** for every three months.
//
// 4. **Years (Y1, Y2, Y3, ...)**:
//    - Represent years in intervals.
//    - The number following **Y** can be any positive integer.
//      - Example: **Y1** for every year, **Y2** for every two years.
//
// 5. **Day Intervals (DT1, DT10, DT15, ...)**:
//    - Represent intervals of days.
//    - The number following **DT** can be any positive integer.
//      - Example: **DT10** for every 10 days, **DT15** for every 15 days.
//
// 6. **Combinations**:
//    - Allow up to 4 combinations of the above intervals.
//    - Combinations should be separated by a plus sign (**+**).
//    - Within a combination, interval codes are separated by spaces.
//    - Codes of the same type should not be repeated within a combination unless separated by a plus sign.
//    - Example: **D1 W1 M1+DT10 DT15+D1 W1 M1 Y1**.
//
// 7. **Invalid Examples**:
//    - **D44 M1**: Invalid because the day value without **T** can only go up to **D7**.
//    - **D9 M1**: Invalid because **D9** is outside the valid day range (**D1** to **D7**).
//    - **D2 W6 M3**: Invalid because weeks can only be **W1** to **W5**.
//    - **D1 W1 M1 Y0**: Invalid because the year interval must be a positive integer.
//    - **DT10 DT15**: Invalid because there is a repetition of code without a plus sign.
//
// 8. **Valid Examples**:
//    - **D1T M1**: Valid, referring to the 1st day of every month.
//    - **D1 W1 M1**: Valid, referring to the Monday of the first week of every month.
//      - If the first week doesn't have a Monday, it uses the Monday of the second week.
//    - **D3 W3 M2**: Valid, referring to Wednesday of the third week in every two months.
//    - **D1T M13**: Valid, referring to the 1st day of every 13 months.
//    - **D1 W1 M1 Y1**: Valid, referring to the Monday of the first week of every month, every year.
//    - **D7 W5 M6 Y2**: Valid, referring to the Sunday of the fifth week (if it exists) in every six months, every two years.
//      - If the fifth week doesn't exist, it uses the Sunday of the fourth week.
//    - **DT10+DT15**: Valid, referring to every 10 days and then every 15 days.
//    - **D1 W1 M1+DT10+DT15+D1 W1 M1 Y1**: Valid, combining multiple independent schedules.
//
// 9. **Date Generation Rules**:
//    - For each combination, generate dates based on the intersection of all intervals within that combination.
//    - Adjust weeks according to the special logic if the specified week doesn't exist.
//    - Do not skip dates due to calendar variations; adjust intelligently to the nearest valid date.
//
// 10. **Summary of Code Structure**:
//     - **Code**: One or more combinations separated by **+**.
//     - **Combination**: One or more interval codes separated by spaces.
//     - **Interval Codes**: **D**, **W**, **M**, **Y**, **DT** codes as specified.
//
// **Note**: This detailed prompt is intended to provide all the necessary information for an AI to understand and generate code that correctly validates and processes the time interval codes according to the specified rules, including handling special cases and ensuring no dates are skipped.
