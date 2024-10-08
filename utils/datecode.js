// **Prompt:**

// I have a system that uses a specific format of codes to represent intervals of time, and I need help validating these codes. The system follows these rules:

// 1. **Days (D1 to D7)**: 
//    - Represent the days of the week. 
//    - D1 is Monday, D7 is Sunday.
//    - If the day code ends with **T** (e.g., **D1T**), it refers to a specific day of the month (1st to 31st). For example, **D1T** means the 1st day of the month, and **D31T** means the 31st day of the month.
//    - Without **T**, the valid range is **D1** to **D7** (days of the week).

// 2. **Weeks (W1 to W4)**:
//    - Represent weeks of the month.
//    - **W1** is the first week, and **W4** is the fourth week.
//    - No other week values are valid beyond **W4**.

// 3. **Months (M1, M2, M3, ...)**:
//    - Represent months in intervals.
//    - The number following **M** can be any positive integer (e.g., **M1** for every month, **M3** for every three months, etc.).

// ### Invalid Examples:
// - **D44 M1**: Invalid because the day value without **T** can only go up to **D7**.
// - **D9 M1**: Invalid because **D9** is outside the valid day range (D1 to D7).
// - **D2 W5 M3**: Invalid because weeks can only be **W1** to **W4**.

// ### Valid Examples:
// - **D1T M1**: Valid, referring to the 1st day of every month.
// - **D1 W1 M1**: Valid, referring to the Monday of the first week of every month.
// - **D3 W3 M2**: Valid, referring to Wednesday of the third week in every two months.
// - **D1T M13**: Valid, referring to the 1st day of every 13 months.


function validateCode(code) {
    // Split the code by spaces to get the individual parts
    const parts = code.split(' ');
  
    // Define valid ranges for each part
    const validDays = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']; // Days of the week
    const validWeeks = ['W1', 'W2', 'W3', 'W4']; // Weeks of the month
  
    // Loop through each part of the code and check if it's valid
    for (let part of parts) {
      if (part.startsWith('D')) {
        const isT = part.endsWith('T');
        const dayNumber = parseInt(part.substring(1, part.length - (isT ? 1 : 0)));
  
        // If T is present, check if the day is between 1 and 31, otherwise between 1 and 7
        if (isNaN(dayNumber) || (isT ? dayNumber < 1 || dayNumber > 31 : dayNumber < 1 || dayNumber > 7)) {
          return false; // Invalid day
        }
      } else if (part.startsWith('W')) {
        if (!validWeeks.includes(part)) {
          return false; // Invalid week
        }
      } else if (part.startsWith('M')) {
        const monthNumber = parseInt(part.substring(1));
        if (isNaN(monthNumber) || monthNumber < 1) {
          return false; // Invalid month
        }
      } else {
        return false; // Unrecognized part
      }
    }
  
    // If all parts are valid, return true
    return true;
  }

function generateDates(code) {
    const now = new Date();
    const parts = code.split(' ');

    let lastDate = new Date(now);
    let secondToLastDate = new Date(now);
    let nextDate = new Date(now);

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
      }
    }

    return {
      secondToLastDate: secondToLastDate.toISOString().split('T')[0],
      lastDate: lastDate.toISOString().split('T')[0],
      nextDate: nextDate.toISOString().split('T')[0]
    };
  }

function generateNextDates(code, numberOfDates, currentDate = new Date()) {
    const parts = code.split(' ');
    let dates = [];

    for (let i = 0; i < numberOfDates; i++) {
      let nextDate = new Date(currentDate);

      for (let part of parts) {
        if (part.startsWith('D')) {
          const isT = part.endsWith('T');
          const dayNumber = parseInt(part.substring(1, part.length - (isT ? 1 : 0)));

          if (isT) {
            nextDate.setDate(dayNumber);
          } else {
            const currentDay = currentDate.getDay();
            const targetDay = dayNumber === 7 ? 0 : dayNumber; // Adjust for Sunday
            const diff = targetDay - currentDay;
            nextDate.setDate(currentDate.getDate() + diff);
          }
        } else if (part.startsWith('W')) {
          const weekNumber = parseInt(part.substring(1));
          const currentWeek = Math.ceil(currentDate.getDate() / 7);
          const diff = weekNumber - currentWeek;
          nextDate.setDate(currentDate.getDate() + diff * 7);
        } else if (part.startsWith('M')) {
          const monthNumber = parseInt(part.substring(1));
          nextDate.setMonth(currentDate.getMonth() + monthNumber);
        }
      }

      dates.push(nextDate.toISOString().split('T')[0]);
      currentDate = new Date(nextDate);
    }

    return dates;
  }

function getTransactionPeriod(code, date) {
    const parts = code.split(' ');
    let startDate = new Date(date);
    let endDate = new Date(date);

    for (let part of parts) {
      if (part.startsWith('D')) {
        const isT = part.endsWith('T');
        const dayNumber = parseInt(part.substring(1, part.length - (isT ? 1 : 0)));

        if (isT) {
          startDate.setDate(dayNumber);
          endDate.setDate(dayNumber);
        } else {
          const currentDay = date.getDay();
          const targetDay = dayNumber === 7 ? 0 : dayNumber; // Adjust for Sunday
          const diff = targetDay - currentDay;
          startDate.setDate(date.getDate() + diff);
          endDate.setDate(date.getDate() + diff);
        }
      } else if (part.startsWith('W')) {
        const weekNumber = parseInt(part.substring(1));
        const currentWeek = Math.ceil(date.getDate() / 7);
        const diff = weekNumber - currentWeek;
        startDate.setDate(date.getDate() + diff * 7);
        endDate.setDate(date.getDate() + diff * 7);
      } else if (part.startsWith('M')) {
        const monthNumber = parseInt(part.substring(1));
        startDate.setMonth(date.getMonth() + monthNumber);
        endDate.setMonth(date.getMonth() + monthNumber);
      }
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  module.exports = {validateCode, generateDates, generateNextDates, getTransactionPeriod};