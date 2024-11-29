function calculateInterest(loanAmount, interestRate, numberOfRepayments, method = 'FLAT_RATE') {
    let interest = 0;
    switch (method) {
        case 'NO_INTEREST':
            interest = 0;
            break;
        case 'FLAT_RATE':
            interest = (loanAmount * interestRate * numberOfRepayments) / 100;
            break;
        case 'ONE_OF_INTEREST':
            interest = (loanAmount * interestRate) / 100;
            break;
        case 'EQUAL_INSTALLMENTS':
            interest = (loanAmount * interestRate * numberOfRepayments) / 100;
            break;
        case 'INTEREST_ONLY':
            interest = (loanAmount * interestRate) / 100;
            break;
        case 'REDUCING_BALANCE':
            for (let i = 0; i < numberOfRepayments; i++) {
                interest += (loanAmount - (loanAmount * i / numberOfRepayments)) * (interestRate / 100);
            }
            break;
        case 'BALLOON_LOAN':
            interest = (loanAmount * interestRate * 0.5) / 100;
            break;
        case 'FIXED_RATE':
            interest = interestRate * numberOfRepayments;
            break;
        case 'UNSECURE_LOAN':
            interest = (loanAmount * interestRate * numberOfRepayments) / 100;
            break;
        case 'INSTALLMENT_LOAN':
            interest = (loanAmount * interestRate * numberOfRepayments) / 100;
            break;
        case 'PAYDAY_LOAN':
            interest = (loanAmount * interestRate * numberOfRepayments) / 100;
            break;
        case 'MICRO_LOAN':
            interest = (loanAmount * interestRate * numberOfRepayments) / 100;
            break;
        case 'BRIDGE_LOAN':
            interest = (loanAmount * interestRate * numberOfRepayments) / 100;
            break;
        case 'AGRICULTURAL_LOAN':
            interest = (loanAmount * interestRate * numberOfRepayments) / 100;
            break;
        case 'EDUCATION_LOAN':
            interest = (loanAmount * interestRate * numberOfRepayments) / 100;
            break;
        case 'WORKIN_CAPITAL':
            interest = (loanAmount * interestRate * numberOfRepayments) / 100;
            break;
        default:
            throw new Error('Invalid interest method');
    }
    console.log('Interest:', interest);
    return interest;
}

    // Start of Selection
    function generateRepaymentSchedule(loanAmount, interestRate, numberOfRepayments, interestMethod, startDate, seperateInterest, repaymentDates, interest) {
        console.log('Generating repayment schedule with the following parameters:', {
            loanAmount,
            interestRate,
            numberOfRepayments,
            interestMethod,
            startDate,
            seperateInterest,
            repaymentDates,
            interest
        });

        console.log('seperateInterest:', seperateInterest);
    
        let repaymentAmounts = [];
    
        console.log('interestMethod note:', interestMethod);
    
        switch (interestMethod) {
            case 'NO_INTEREST':
                console.log('Interest Method: NO_INTEREST');
                for (let i = 0; i < numberOfRepayments; i++) {
                    const principal = loanAmount / numberOfRepayments;
                    console.log(`Repayment ${i + 1}: Principal = ${principal}, Interest = 0`);
                    repaymentAmounts.push({
                        principal: principal,
                        interest: 0
                    });
                }
                break;
            case 'ONE_OF_INTEREST':
            case 'INTEREST_ONLY':
            case 'BALLOON_LOAN':
                console.log(`Interest Method: ${interestMethod}`);
                const halfPrincipal = loanAmount / 2;
                const equalPrincipal = halfPrincipal / (numberOfRepayments - 1);
                for (let i = 0; i < numberOfRepayments; i++) {
                    const principal = i === numberOfRepayments - 1 ? halfPrincipal : equalPrincipal;
                    const interestShare = interest / numberOfRepayments;
                    console.log(`Repayment ${i + 1}: Principal = ${principal}, Interest = ${interestShare}`);
                    repaymentAmounts.push({
                        principal: principal,
                        interest: interestShare
                    });
                }
                break;
            case 'EQUAL_INSTALLMENTS':
            case 'FLAT_RATE':
            case 'FIXED_RATE':
            case 'UNSECURE_LOAN':
            case 'INSTALLMENT_LOAN':
            case 'PAYDAY_LOAN':
            case 'MICRO_LOAN':
            case 'BRIDGE_LOAN':
            case 'AGRICULTURAL_LOAN':
            case 'EDUCATION_LOAN':
            case 'WORKIN_CAPITAL':
                console.log(`Interest Method: ${interestMethod}`);
                const totalAmount = parseFloat(loanAmount) + parseFloat(interest);
                const installmentAmount = totalAmount / numberOfRepayments;
                console.log(`Total Amount: ${totalAmount}, Installment Amount: ${installmentAmount}`);
                for (let i = 0; i < numberOfRepayments; i++) {
                    const principal = !seperateInterest ? parseFloat((loanAmount / numberOfRepayments).toFixed(2)) : parseFloat(installmentAmount.toFixed(2));
                    const interestPortion = !seperateInterest ? parseFloat((interest / numberOfRepayments).toFixed(2)) : 0;
                    console.log(`Repayment ${i + 1}: Principal = ${principal}, Interest = ${interestPortion}`);
                    repaymentAmounts.push({
                        principal: principal,
                        interest: interestPortion
                    });
                }
                break;
            case 'REDUCING_BALANCE':
                console.log('Interest Method: REDUCING_BALANCE');
                let remainingLoan = parseFloat(loanAmount);
                for (let i = 0; i < numberOfRepayments; i++) {
                    const principal = parseFloat((loanAmount / numberOfRepayments).toFixed(2));
                    const interestPayment = parseFloat((remainingLoan * (interestRate / 100)).toFixed(2));
                    console.log(`Repayment ${i + 1}: Principal = ${principal}, Remaining Loan = ${remainingLoan}, Interest = ${interestPayment}`);
                    repaymentAmounts.push({
                        principal: principal,
                        interest: interestPayment
                    });
                    remainingLoan -= principal;
                }
                break;
            default:
                console.error(`Invalid interest method: ${interestMethod}`);
                throw new Error('Invalid interest method');
        }
    
        if (seperateInterest) {
            const totalInterest = repaymentAmounts.reduce((acc, curr) => acc + curr.interest, 0);
            console.log(`Total Interest to be separated: ${totalInterest}`);
            // Set all interest amounts to 0
            repaymentAmounts = repaymentAmounts.map(payment => ({
                principal: payment.principal,
                interest: 0
            }));
            // Create a separate interest payment
            const interestPayment = {
                principal: 0,
                interest: parseFloat(totalInterest.toFixed(2))
            };
            repaymentAmounts.unshift(interestPayment);
            console.log('Added separate interest payment:', interestPayment);
            // Adjust repaymentDates by adding the first date for the interest payment
            repaymentDates.unshift(repaymentDates[0]);
        }
    
        const repaymentSchedule = repaymentDates.map((date, index) => {
            const schedule = {
                scheduledPaymentDate: date,
                principalAmount: parseFloat(repaymentAmounts[index].principal),
                interestAmount: parseFloat(repaymentAmounts[index].interest),
                status: 'PENDING'
            };
            console.log(`Scheduled Payment ${index + 1}:`, schedule);
            return schedule;
        });
    
        console.log('Final Repayment Schedule:', repaymentSchedule);
        return repaymentSchedule;
    }

module.exports = { calculateInterest, generateRepaymentSchedule };
