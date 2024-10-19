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


function validateCode(code) {
    // Split the code by plus signs to get the individual combinations
    const combinations = code.split('+');

    // Loop through each combination
    for (let combination of combinations) {
        // Split the combination by spaces to get the individual parts
        const parts = combination.split(' ');

        // Loop through each part of the combination and check if it's valid
        for (let part of parts) {
            if (part.startsWith('D')) {
                const isT = part.endsWith('T');
                const dayNumber = parseInt(part.substring(1, part.length - (isT ? 1 : 0)));

                // If T is present, check if the day is between 1 and 31, otherwise between 1 and 7
                if (isNaN(dayNumber) || (isT ? dayNumber < 1 || dayNumber > 31 : dayNumber < 1 || dayNumber > 7)) {
                    return false; // Invalid day
                }
                // Check for unrecognized characters
                if (part.length > (isT ? 3 : 2)) {
                    return false; // Unrecognized characters
                }
            } else if (part.startsWith('W')) {
                const weekNumber = parseInt(part.substring(1));
                if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 5) {
                    return false; // Invalid week
                }
            } else if (part.startsWith('M')) {
                const monthNumber = parseInt(part.substring(1));
                if (isNaN(monthNumber) || monthNumber < 1) {
                    return false; // Invalid month
                }
            } else if (part.startsWith('Y')) {
                const yearNumber = parseInt(part.substring(1));
                if (isNaN(yearNumber) || yearNumber < 1) {
                    return false; // Invalid year
                }
            } else if (part.startsWith('DT')) {
                const dayInterval = parseInt(part.substring(2));
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

function generateDates(code) {
    const now = new Date();
    const combinations = code.split('+');

    let lastDate = new Date(now);
    let secondToLastDate = new Date(now);
    let nextDate = new Date(now);

    for (let combination of combinations) {
        const parts = combination.split(' ');

        for (let part of parts) {
            if (part.startsWith('D')) {
                const isT = part.endsWith('T');
                const dayNumber = parseInt(part.substring(1, part.length - (isT ? 1 : 0)));

                if (isT) {
                    // Specific day of the month
                    lastDate.setDate(dayNumber);
                    secondToLastDate.setDate(dayNumber);
                    nextDate.setDate(dayNumber);
                } else {
                    // Day of the week
                    const currentDay = now.getDay();
                    const targetDay = dayNumber === 7 ? 0 : dayNumber; // Adjust for Sunday
                    const diff = targetDay - currentDay;

                    lastDate.setDate(now.getDate() + diff - 7);
                    secondToLastDate.setDate(now.getDate() + diff - 14);
                    nextDate.setDate(now.getDate() + diff);
                }
            } else if (part.startsWith('W')) {
                const weekNumber = parseInt(part.substring(1));
                const currentWeek = Math.ceil(now.getDate() / 7);
                const diff = weekNumber - currentWeek;

                lastDate.setDate(now.getDate() + diff * 7 - 7);
                secondToLastDate.setDate(now.getDate() + diff * 7 - 14);
                nextDate.setDate(now.getDate() + diff * 7);
            } else if (part.startsWith('M')) {
                const monthNumber = parseInt(part.substring(1));

                lastDate.setMonth(now.getMonth() - monthNumber);
                secondToLastDate.setMonth(now.getMonth() - monthNumber * 2);
                nextDate.setMonth(now.getMonth() + monthNumber);
            } else if (part.startsWith('Y')) {
                const yearNumber = parseInt(part.substring(1));

                lastDate.setFullYear(now.getFullYear() - yearNumber);
                secondToLastDate.setFullYear(now.getFullYear() - yearNumber * 2);
                nextDate.setFullYear(now.getFullYear() + yearNumber);
            } else if (part.startsWith('DT')) {
                const dayInterval = parseInt(part.substring(2));

                lastDate.setDate(now.getDate() - dayInterval);
                secondToLastDate.setDate(now.getDate() - dayInterval * 2);
                nextDate.setDate(now.getDate() + dayInterval);
            }
        }
    }

    return {
        secondToLastDate: secondToLastDate.toISOString().split('T')[0],
        lastDate: lastDate.toISOString().split('T')[0],
        nextDate: nextDate.toISOString().split('T')[0]
    };
}

function generateNextDates(code, numberOfDates, currentDate = new Date()) {
    const combinations = code.split('+');
    let dates = [];

    for (let i = 0; i < numberOfDates; i++) {
        let nextDate = new Date(currentDate);

        for (let combination of combinations) {
            const parts = combination.split(' ');

            for (let part of parts) {
                if (part.startsWith('D')) {
                    const isT = part.endsWith('T');
                    const dayNumber = parseInt(part.substring(1, part.length - (isT ? 1 : 0)));

                    if (isT) {
                        nextDate.setDate(dayNumber);
                    } else {
                        const currentDay = nextDate.getDay();
                        const targetDay = dayNumber === 7 ? 0 : dayNumber; // Adjust for Sunday
                        const diff = targetDay - currentDay;
                        nextDate.setDate(nextDate.getDate() + diff);
                    }
                } else if (part.startsWith('W')) {
                    const weekNumber = parseInt(part.substring(1));
                    const currentWeek = Math.ceil(nextDate.getDate() / 7);
                    const diff = weekNumber - currentWeek;
                    nextDate.setDate(nextDate.getDate() + diff * 7);
                } else if (part.startsWith('M')) {
                    const monthNumber = parseInt(part.substring(1));
                    nextDate.setMonth(nextDate.getMonth() + monthNumber);
                } else if (part.startsWith('Y')) {
                    const yearNumber = parseInt(part.substring(1));
                    nextDate.setFullYear(nextDate.getFullYear() + yearNumber);
                } else if (part.startsWith('DT')) {
                    const dayInterval = parseInt(part.substring(2));
                    nextDate.setDate(nextDate.getDate() + dayInterval);
                }
            }
        }

        currentDate = new Date(nextDate);
        dates.push(nextDate.toISOString().split('T')[0]);
    }

    return dates;
}

function getTransactionPeriod(code, date) {
    const combinations = code.split('+');
    let startDate = new Date(date);
    let endDate = new Date(date);

    for (let combination of combinations) {
        const parts = combination.split(' ');

        for (let part of parts) {
            if (part.startsWith('D')) {
                const isT = part.endsWith('T');
                const dayNumber = parseInt(part.substring(1, part.length - (isT ? 1 : 0)));

                if (isT) {
                    startDate.setDate(dayNumber);
                    endDate.setDate(dayNumber);
                } else {
                    const currentDay = startDate.getDay();
                    const targetDay = dayNumber === 7 ? 0 : dayNumber; // Adjust for Sunday
                    const diff = targetDay - currentDay;
                    startDate.setDate(startDate.getDate() + diff);
                    endDate.setDate(endDate.getDate() + diff);
                }
            } else if (part.startsWith('W')) {
                const weekNumber = parseInt(part.substring(1));
                const currentWeek = Math.ceil(startDate.getDate() / 7);
                const diff = weekNumber - currentWeek;
                startDate.setDate(startDate.getDate() + diff * 7);
                endDate.setDate(endDate.getDate() + diff * 7);
            } else if (part.startsWith('M')) {
                const monthNumber = parseInt(part.substring(1));
                startDate.setMonth(startDate.getMonth() + monthNumber);
                endDate.setMonth(endDate.getMonth() + monthNumber);
            } else if (part.startsWith('Y')) {
                const yearNumber = parseInt(part.substring(1));
                startDate.setFullYear(startDate.getFullYear() + yearNumber);
                endDate.setFullYear(endDate.getFullYear() + yearNumber);
            } else if (part.startsWith('DT')) {
                const dayInterval = parseInt(part.substring(2));
                startDate.setDate(startDate.getDate() + dayInterval);
                endDate.setDate(endDate.getDate() + dayInterval);
            }
        }
    }

    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
}

  module.exports = {validateCode, generateDates, generateNextDates, getTransactionPeriod};