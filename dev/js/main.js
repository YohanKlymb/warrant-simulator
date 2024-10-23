const form = document.querySelector('form');
const inputs = form.querySelectorAll('input, select');
const scenarioBoundary = 0.25;
const metrics = [
    { key: 'preMoneyValuation', label: 'Pre-Money Valuation' },
    { key: 'initialNumberOfShares', label: 'Initial Number of Shares' },
    { key: 'founderOwnershipBefore', label: 'Founder Ownership Before' },
    { key: 'amountRaised', label: 'Amount Raised' },
    { key: 'newSharesIssued', label: 'New Shares Issued' },
    { key: 'pricePerShare', label: 'Price per Share' },
    { key: 'warrantAmount', label: 'Warrant Amount' },
    { key: 'warrantsIssued', label: 'Warrants Issued' },
    { key: 'warrantExercisePrice', label: 'Warrant Exercise Price' },
    { key: 'postMoneyValuation', label: 'Post-Money Valuation' },
    { key: 'dilutionFromFundraising', label: 'Dilution from Fundraising' },
    { key: 'dilutionFromWarrants', label: 'Dilution from Warrants' },
    { key: 'founderOwnershipAfter', label: 'Founder Ownership After' }
];

////////////////
// Handle inputs
////////////////

function parseNumericInput(inputValue, options = {}) {
    // Options: allowNegative, isPercentage, suffix ('k', 'm', or null)
    let value = inputValue.trim();

    // Return null if the input is empty
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const { allowNegative = false, isPercentage = false, suffix = null } = options;

    // Remove commas and spaces
    value = value.replace(/,/g, '').replace(/\s+/g, '');

    // Remove suffix if present
    if (suffix && value.toLowerCase().endsWith(suffix)) {
        value = value.slice(0, -suffix.length);
    }

    // Remove percentage sign if present
    if (isPercentage) {
        value = value.replace('%', '');
    }

    // Allow negative sign if specified
    const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    if (!regex.test(value)) {
        return NaN;
    }

    // Parse the numeric value
    let numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
        return NaN;
    }

    // Apply suffix multiplier
    if (suffix === 'k') {
        numericValue *= 1e3;
    } else if (suffix === 'm') {
        numericValue *= 1e6;
    }

    // Convert percentage to decimal
    if (isPercentage) {
        numericValue /= 100;
    }

    return numericValue;
}

function formatNumericInput(value, options = {}) {
    // Options: suffix ('k', 'm', or null), decimalPlaces, isPercentage
    const { suffix = null, decimalPlaces = 2, isPercentage = false } = options;

    if (isNaN(value) || value === null) {
        return '';
    }

    let formattedValue = value;

    // Rescale if percentage
    if (isPercentage) {
        formattedValue *= 100
    }

    // Apply suffix divider
    if (suffix === 'k') {
        formattedValue /= 1e3;
    } else if (suffix === 'm') {
        formattedValue /= 1e6;
    }

    formattedValue = formattedValue.toLocaleString('en-US', { maximumFractionDigits: decimalPlaces });

    if (suffix) {
        formattedValue += suffix;
    }

    // Append percentage sign if needed
    if (isPercentage) {
        formattedValue += '%';
    }

    return formattedValue;
}

function adjustCursorPosition(input, options, cursorPosition=null) {
    if (cursorPosition === null) {
        cursorPosition = input.selectionStart;
    }

    // Check if there is a suffix (either suffix is defined or isPercentage is true)
    const hasSuffix = options.suffix || options.isPercentage;
    const suffixLength = hasSuffix ? 1 : 0;

    // Calculate the maximum allowed cursor position
    const maxPosition = input.value.length - suffixLength;

    // If the input starts with '-', ensure cursorPosition is at least 1
    const minPosition = input.value.startsWith('-') ? 1 : 0;

    // Ensure cursor position is within allowed range
    if (cursorPosition > maxPosition) {
        cursorPosition = maxPosition;
    } else if (cursorPosition < minPosition) {
        cursorPosition = minPosition;
    }

    // Ensure cursor doesn't go beyond the input value minus the suffix
    // If the cursor jumps right after the minus sign is added, reset it
    if (input.value.startsWith('-') && cursorPosition > maxPosition) {
        cursorPosition = 1; // Position the cursor right after the minus sign
    } else if (cursorPosition > maxPosition) {
        cursorPosition = maxPosition;
    }
    
    input.setSelectionRange(cursorPosition, cursorPosition);
}

function attachInputListeners(selector, options = {}) {
    const inputs = document.querySelectorAll(selector);

    inputs.forEach(input => {
        input.addEventListener('input', function(event) {
            handleInputChange(event, options);
            handleInputFocus(event, options);
            updateResults();
        });
        input.addEventListener('click', function(event) {
            handleInputFocus(event, options)
        });
        input.addEventListener('keydown', function(event) {
            handleInputFocus(event, options)
        });
        input.addEventListener('focus', function(event) {
            handleInputFocus(event, options)
        });
        input.addEventListener('blur', function(event) {
            handleInputBlur(event, options);
            updateResults(); 
        });
    });
}

function getInputOptions(input) {
    const options = {};

    if (input.classList.contains('input-k')) {
        options.suffix = 'k';
    } else if (input.classList.contains('input-m')) {
        options.suffix = 'm';
    }

    if (input.classList.contains('percentage-input')) {
        options.isPercentage = true;
    }

    if (input.id === 'cash_burn') {
        options.allowNegative = true;
    } else {
        options.allowNegative = false;
    }

    return options;
}

function handleInputBlur(event, options = {}) {
    const input = event.target;

    // Remove the suffix if it is the only character
    if (input.value === "m" || input.value === "k" || input.value === "%") {
        input.value = "";
    }

    // Allow to remove the input-error without waiting for a re-submit
    isInputValid(input);

    // Get options based on input attributes if not provided
    if (Object.keys(options).length === 0) {
        options = getInputOptions(input);
    }

    // Parse the input value
    let numericValue = parseNumericInput(input.value, options);

    // Format the input value
    const formattedValue = formatNumericInput(numericValue, options);

    // Check if parsing was successful
    if (isNaN(numericValue) || numericValue === null) {
        // Do not change the input value; let the user see what they entered
        return;
    }

    input.value = formattedValue;
}

function handleInputChange(event, options = {}) {
    const input = event.target;
    let cursorPosition = input.selectionStart;

    // Get options based on input attributes if not provided
    if (Object.keys(options).length === 0) {
        options = getInputOptions(input);
    }

    // Remove invalid characters
    let value = input.value;

    // Remove suffixes and percentage sign for processing
    if (options.suffix && value.endsWith(options.suffix)) {
        value = value.slice(0, -options.suffix.length);
    }

    if (options.isPercentage && value.endsWith('%')) {
        value = value.slice(0, -1);
    }

    if (options.allowNegative) {
        value = value.replace(/(?!^-)-/g, ''); // Remove extra dashes
    }
    value = value.replace(/[^0-9.\-]/g, '');

    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Set the value back to the input
    input.value = value;

    // Append suffix or percentage sign if specified
    if (options.suffix) {
        input.value += options.suffix;
    } else if (options.isPercentage) {
        input.value += '%';
    }

    adjustCursorPosition(input, options, cursorPosition)

    // Handle interdependent inputs
    handleInterdependentInputs(input);
}

function handleInputFocus(event, options = {}) {
    const input = event.target;
    // Remove commas
    input.value = input.value.replace(/,/g, '');

    // Adjust cursor position
    adjustCursorPosition(input, options)
}

function handleInterdependentInputs(changedInput) {
    const numberInput = document.getElementById('number_of_warrants');
    const amountInput = document.getElementById('amount_of_warrants');
    const exercisePriceInput = document.getElementById('exercise_price');

    // Get numeric values
    const optionsNumber = getInputOptions(numberInput);
    const optionsAmount = getInputOptions(amountInput);
    const optionsExercisePrice = getInputOptions(exercisePriceInput);

    let numberValue = parseNumericInput(numberInput.value, optionsNumber);
    let amountValue = parseNumericInput(amountInput.value, optionsAmount);
    let exercisePrice = parseNumericInput(exercisePriceInput.value, optionsExercisePrice);

    // Only proceed if exercisePrice is valid and not NaN
    if (isNaN(exercisePrice) || exercisePrice === null) {
        return; // Cannot compute without exercise price
    }

    if (changedInput.id === 'number_of_warrants' && numberValue !== null) {
        // Update amount_of_warrants
        amountValue = numberValue * exercisePrice;
        amountInput.value = formatNumericInput(amountValue, optionsAmount);
    } else if (changedInput.id === 'amount_of_warrants' && amountValue !== null) {
        // Update number_of_warrants
        numberValue = amountValue / exercisePrice;
        numberInput.value = formatNumericInput(numberValue, optionsNumber);
    } else if (changedInput.id === 'exercise_price') {
        // Update both if possible
        if (numberValue !== null) {
            amountValue = numberValue * exercisePrice;
            amountInput.value = formatNumericInput(amountValue, optionsAmount);
        } else if (amountValue !== null) {
            numberValue = amountValue / exercisePrice;
            numberInput.value = formatNumericInput(numberValue, optionsNumber);
        }
    }
}

function handleWarrantTypeChange(selectedType, setFocus = true) {
    const fixedPriceInput = document.getElementById('fixedPriceInput');
    const floorCapInput = document.getElementById('floorCapInput');
    const discountPriceInput = document.getElementById('discount_price');
    const exercisePriceInput = document.getElementById('exercise_price');

    if (selectedType === 'fixed') {
        // Show fixed price input and hide floor/cap input
        fixedPriceInput.style.display = 'block';
        floorCapInput.style.display = 'none';

        // Focus on the exercise price input
        // Focus on the exercise price input only if setFocus is true
        if (setFocus) {
            exercisePriceInput.focus();
        }
        
    } else if (selectedType === 'floor_cap') {
        // Show floor/cap input and hide fixed price input
        fixedPriceInput.style.display = 'none';
        floorCapInput.style.display = 'block';

        // Focus on the discount price input
        if (setFocus) {
            discountPriceInput.focus();
        }        
    }
}

function toggleButtonState(activeButtonId, inactiveButtonId) {
    document.getElementById(activeButtonId).classList.add('active');
    document.getElementById(inactiveButtonId).classList.remove('active');
}

function handleSelectionChange(input) {
    // Adjust cursor position if necessary
    const options = getInputOptions(input);
    adjustCursorPosition(input, options);
}

function captureValues() {
    const values = {};
    let hasError = false;

    // List of required fields
    const requiredFields = [
        'current_ownership',
        'number_of_shares',
        'amount_to_raise',
        'pre_money_valuation'
    ];

    // Capture segmented button selection for warrant type
    const selectedWarrantType = document.querySelector('.segmented-button.active').id;
    if (selectedWarrantType === 'fixedPriceButton') {
        requiredFields.push('fixed_price');
        values.warrant_type = 'fixed';
    } else if (selectedWarrantType === 'floorCapButton') {
        requiredFields.push('discount_price');
        values.warrant_type = 'floor_cap';
    } else {
        throw new Error('Unknown warrant type');
    }

    // Validate inputs
    inputs.forEach(input => {
        const isValid = isInputValid(input);
        if (!isValid) {
            hasError = true;
        }

        const options = getInputOptions(input);
        const numericValue = parseNumericInput(input.value, options);
        values[input.name] = isNaN(numericValue) ? null : numericValue;
    });

    // Additional validation: Ensure at least one of number_of_warrants or amount_of_warrants is provided
    if (values.number_of_warrants === null && values.amount_of_warrants === null) {
        hasError = true;
        const numberInput = document.getElementById('number_of_warrants');
        const amountInput = document.getElementById('amount_of_warrants');
        numberInput.classList.add('input-error');
        amountInput.classList.add('input-error');
        console.log(`Either number of warrants or amount of warrants must be provided.`);
    }

    // Check if floor price is above cap price when both are provided
    const floorPrice = values.floor_price;
    const capPrice = values.cap_price;
    if (floorPrice !== undefined && capPrice !== undefined && floorPrice > capPrice) {
        hasError = true;
        const floorInput = document.getElementById('floor_price');
        const capInput = document.getElementById('cap_price');
        floorInput.classList.add('input-error');
        capInput.classList.add('input-error');
        console.log(`Floor price cannot be higher than cap price.`);
    }

    if (hasError) {
        throw new Error('Input error.');
    }

    return values;
}

function isInputValid(input) {
    
    // Skip validation for hidden inputs
    if (input.parentElement.style.display === 'none') {
        return true;
    }

    const options = getInputOptions(input);
    const value = input.value;
    const inputName = input.name;

    // Validate `exercise_price` or `discount_price` on blur only
    input.addEventListener('blur', () => {
        const selectedWarrantType = document.querySelector('.segmented-button.active').id;

        if (selectedWarrantType === 'fixedPriceButton' && inputName === 'exercise_price') {
            if (input.value === '') {
                input.classList.add('input-error');
                console.log(`Exercise price is required for fixed price warrants.`);
                return false;
            } else {
                input.classList.remove('input-error');
            }
        }

        if (selectedWarrantType === 'floorCapButton' && inputName === 'discount_price') {
            if (input.value === '') {
                input.classList.add('input-error');
                console.log(`Discount price is required for floor & cap warrants.`);
                return false;
            } else {
                input.classList.remove('input-error');
            }
        }
    });

    // Handle interdependent inputs: `number_of_warrants` and `amount_of_warrants`
    if (inputName === 'number_of_warrants' || inputName === 'amount_of_warrants') {
        const numberInput = document.getElementById('number_of_warrants');
        const amountInput = document.getElementById('amount_of_warrants');

        const numberValue = numberInput.value.trim();
        const amountValue = amountInput.value.trim();

        // If both are empty, add input-error class to both
        if (numberValue === '' && amountValue === '') {
            numberInput.classList.add('input-error');
            amountInput.classList.add('input-error');
            console.log(`Either number of warrants or amount of warrants must be provided.`);
            return false;
        } else {
            // Remove input-error class from the one that has value
            if (numberValue !== '') {
                numberInput.classList.remove('input-error');
            }
            if (amountValue !== '') {
                amountInput.classList.remove('input-error');
            }
        }
    }

    // Skip validation if the field is empty
    if (input.value === '') {
        input.classList.remove('input-error');
        return true;
    }

    const numericValue = parseNumericInput(value, options);

    if (isNaN(numericValue)) {
        input.classList.add('input-error');
        console.log(`Invalid value in field "${inputName}": ${value}`);
        return false;
    }

    // Specific validation for discount_price (should be between 0% and 100%)
    if (inputName === 'discount_price') {
        if (numericValue <= 0 || numericValue >= 1) {
            input.classList.add('input-error');
            console.log(`Discount price should be between 0% and 100%: ${value}`);
            return false;
        }
    }

    input.classList.remove('input-error');
    return true;
}

//////////////////
// Utils
//////////////////

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

function sigmoidAdjusted(value, minVal, maxVal, midVal = null, curveCoef = 10) {
    // Return 1 if no range (minVal === maxVal)
    if (minVal === maxVal) {
        return 1;
    }

    // If midVal is not provided, set it as the midpoint between minVal and maxVal
    if (midVal == null) {
        midVal = (minVal + maxVal) / 2;
    }

    // If reversed scale with minVal > maxVal, get the inverse of all values
    if (minVal > maxVal) {
        value = -value;
        minVal = -minVal;
        maxVal = -maxVal;
        midVal = -midVal;
    }

    // Normalize the input value to a range suitable for the sigmoid function
    const normalizedValue = curveCoef * (value - midVal) / (maxVal - minVal);

    // Adjust output for boundaries: 
    // values less than minVal should return between 0 and 0.1, 
    // and values greater than maxVal should return between 0.9 and 1.
    if (value < minVal) {
        return 0.1 * sigmoid(normalizedValue);
    } else if (value > maxVal) {
        return 0.9 + 0.1 * sigmoid(normalizedValue);
    } else {
        return sigmoid(normalizedValue);
    }
}

function roundToSignificantDigits(value, significantDigits = null) {
    // Handle limit cases
    if (value === 0) {
        return value;
    }

    // If significantDigits is null, calculate it as the length of the number - 2
    if (significantDigits === null) {
        significantDigits = Math.floor(Math.log10(value)) - 1;
    }

    // Calculate the rounding factor
    const factor = Math.pow(10, significantDigits);
    // Round the value to the nearest significant digit
    return Math.round(value / factor) * factor;
}

function formatToPercentage(value, nbDecimal=2) {
    // Multiply by 100 to convert the decimal to percentage
    // Use toFixed(2) to keep two decimal places
    return (value * 100).toFixed(nbDecimal) + '%';
}

function formatToCurrency(value, nbDecimal = 0, reduce = false) {
    if (reduce) {
        if (value >= 1e6) {
            let reducedValue = value / 1e6;
            let decimalsToShow = nbDecimal;

            // If the reduced value is a whole number or value is large, show no decimals
            if (reducedValue >= 10 || reducedValue % 1 === 0) {
                decimalsToShow = 0;
            }

            return reducedValue.toLocaleString('en-US', {
                maximumFractionDigits: decimalsToShow,
                minimumFractionDigits: decimalsToShow,
            }) + 'm'; // Millions
        } else if (value >= 1e3) {
            let reducedValue = value / 1e3;
            let decimalsToShow = nbDecimal;

            // If the reduced value is a whole number, show no decimals
            if (reducedValue % 1 === 0) {
                decimalsToShow = 0;
            }

            return reducedValue.toLocaleString('en-US', {
                maximumFractionDigits: decimalsToShow,
                minimumFractionDigits: decimalsToShow,
            }) + 'k'; // Thousands
        }
    }

    return value.toLocaleString('en-US', { maximumFractionDigits: nbDecimal });
}

function validateEmail(email) {
    // Basic email regex pattern
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
}

function displayWarning(warningId, message) {
    const warningElement = document.getElementById(warningId);
    if (warningElement) {
        warningElement.textContent = message;
        warningElement.style.display = 'block';
    }
}

function hideWarning(warningId) {
    const warningElement = document.getElementById(warningId);
    if (warningElement) {
        warningElement.style.display = 'none';
    }
}

//////////////////
// Calculation Functions
//////////////////

function calculatePricePerShare(values) {
    const { pre_money_valuation, number_of_shares } = values;
    if (!pre_money_valuation || !number_of_shares) {
        throw new Error('Missing pre-money valuation or number of shares');
    }
    return pre_money_valuation / number_of_shares;
}

function calculateNewSharesIssued(values, pricePerShare) {
    const { amount_to_raise } = values;
    if (!amount_to_raise) {
        throw new Error('Missing amount to raise');
    }
    return Math.round(amount_to_raise / pricePerShare);
}

function calculateWarrantShares(values, pricePerShare) {
    const selectedWarrantType = values.warrant_type; // 'fixed' or 'floor_cap'
    let exercisePrice;
    let numberOfWarrantShares;

    if (selectedWarrantType === 'fixed') {
        exercisePrice = values.exercise_price;
        if (!exercisePrice) {
            throw new Error('Missing exercise price');
        }
        // Use number_of_warrants or amount_of_warrants 
        if (values.number_of_warrants) {
            numberOfWarrantShares = values.number_of_warrants;
        } else if (values.amount_of_warrants ) {
            numberOfWarrantShares = values.amount_of_warrants  / exercisePrice;
        } else {
            throw new Error('Missing number of warrants or total warrant amount');
        }
    } else if (selectedWarrantType === 'floor_cap') {
        const { floor_price, cap_price, discount_price } = values;
        if (!discount_price) {
            throw new Error('Missing discount price');
        }

        // Determine exercise price based on floor, cap, discount and price per share
        exercisePrice = pricePerShare * (1 - discount_price)
        if (floor_price !== undefined && cap_price !== undefined) {
            // Both floor and cap are provided, apply both limits
            exercisePrice = Math.max(floor_price, Math.min(exercisePrice, cap_price));
        } else if (floor_price !== undefined) {
            // Only floor is provided, apply floor as the minimum
            exercisePrice = Math.max(floor_price, exercisePrice);
        } else if (cap_price !== undefined) {
            // Only cap is provided, apply cap as the maximum
            exercisePrice = Math.min(exercisePrice, cap_price);
        }

        // Use number_of_warrants or amount_of_warrants 
        if (values.number_of_warrants) {
            numberOfWarrantShares = values.number_of_warrants;
        } else if (values.amount_of_warrants ) {
            numberOfWarrantShares = values.amount_of_warrants  / exercisePrice;
        } else {
            throw new Error('Missing number of warrants or total warrant amount');
        }
    } else {
        throw new Error('Invalid warrant type');
    }

    return {
        exercisePrice,
        numberOfWarrantShares
    };
}

function calculateDilutionImpact(values, newSharesIssued, warrantShares) {
    const { current_ownership, number_of_shares } = values; // current_ownership as decimal (e.g., 0.40 for 40%)
    if (current_ownership === undefined || number_of_shares === undefined) {
        throw new Error('Missing current ownership or number of shares');
    }

    // Original founder shares based on initial ownership
    const originalFounderShares = Math.round(number_of_shares * current_ownership);

    // Shares after the fundraising (without the warrants)
    const totalSharesAfterFundraising = Math.round(number_of_shares + newSharesIssued);

    // Total shares after both fundraising and warrant exercise
    const totalSharesAfterAll = Math.round(number_of_shares + newSharesIssued + warrantShares);

    // Ownership after fundraising but before warrant exercise
    const founderOwnershipAfterFundraising = originalFounderShares / totalSharesAfterFundraising;

    // Ownership after both fundraising and warrant exercise
    const founderOwnershipAfter = originalFounderShares / totalSharesAfterAll;

    // Dilution from fundraising
    const dilutionFromFundraising = current_ownership - founderOwnershipAfterFundraising;

    // Dilution from warrants
    const dilutionFromWarrants = founderOwnershipAfterFundraising - founderOwnershipAfter;

    // Return the ownership after all dilutions and the separate dilutions
    return {
        founderOwnershipAfter,  // Ownership after both fundraising and warrants
        dilutionFromFundraising,   // Dilution due to fundraising
        dilutionFromWarrants       // Dilution due to warrant exercise
    };
}

function calculatePostMoneyValuation(values, warrantAmount) {
    const { pre_money_valuation, amount_to_raise } = values;
    if (pre_money_valuation === undefined || amount_to_raise === undefined) {
        throw new Error('Missing pre-money valuation or amount to raise');
    }

    const postMoneyValuation = pre_money_valuation + amount_to_raise + warrantAmount;
    return postMoneyValuation;
}

function calculateCashFlowImpact(exercisePrice, numberOfWarrantShares) {
    return exercisePrice * numberOfWarrantShares;
}

function aggregateCalculations(values) {
    const pricePerShare = calculatePricePerShare(values);
    const newSharesIssued = calculateNewSharesIssued(values, pricePerShare);

    const { exercisePrice, numberOfWarrantShares } = calculateWarrantShares(values, pricePerShare);

    const warrantAmount = calculateCashFlowImpact(exercisePrice, numberOfWarrantShares);

    const { founderOwnershipAfter, dilutionFromFundraising, dilutionFromWarrants } = calculateDilutionImpact(values, newSharesIssued, numberOfWarrantShares);

    const postMoneyValuation = calculatePostMoneyValuation(values, warrantAmount);

    return {
        pricePerShare,
        newSharesIssued,
        exercisePrice,
        numberOfWarrantShares,
        warrantAmount,
        founderOwnershipAfter,
        dilutionFromFundraising,
        dilutionFromWarrants,
        postMoneyValuation,
        originalFounderOwnership: values.current_ownership,
        preMoneyValuation: values.pre_money_valuation,
        amountRaised: values.amount_to_raise,
        initialShares: values.number_of_shares,
    };
}

function computeScenarios(values) {
    // Define 3 scenarios: Pessimistic, Base, and Optimistic
    const minValuation = values.pre_money_valuation * (1 - scenarioBoundary);
    const baseValuation = values.pre_money_valuation; // Base scenario
    const maxValuation = values.pre_money_valuation * (1 + scenarioBoundary);

    const scenarios = [
        { name: 'Pessimistic', pre_money_valuation: minValuation },
        { name: 'Base', pre_money_valuation: baseValuation },
        { name: 'Optimistic', pre_money_valuation: maxValuation }
    ];

    const scenarioResults = [];

    for (const scenario of scenarios) {
        const tempValues = { ...values, pre_money_valuation: scenario.pre_money_valuation };
        const calculations = aggregateCalculations(tempValues);
        scenarioResults.push({
            name: scenario.name,
            preMoneyValuation: scenario.pre_money_valuation,
            initialNumberOfShares: tempValues.number_of_shares,
            founderOwnershipBefore: tempValues.current_ownership,
            amountRaised: tempValues.amount_to_raise,
            newSharesIssued: calculations.newSharesIssued,
            pricePerShare: calculations.pricePerShare,
            warrantAmount: tempValues.amount_of_warrants,
            warrantsIssued: calculations.numberOfWarrantShares,
            warrantExercisePrice: calculations.exercisePrice,
            postMoneyValuation: calculations.postMoneyValuation,
            dilutionFromFundraising: calculations.dilutionFromFundraising, // percentage
            dilutionFromWarrants : calculations.dilutionFromWarrants, // percentage
            founderOwnershipAfter: calculations.founderOwnershipAfter // percentage            
        });
    }

    return scenarioResults;
}


//////////////////////////
// Visualization Functions
//////////////////////////

// Generic method to render or update a Plotly chart with animations
function renderOrUpdatePlot(chartId, data, layout, onlyRender = false, transitionOptions = { duration: 750, easing: 'cubic-in-out' }) {

    // Create config
    var config = {
        displayModeBar: false,  // Hide the modebar
        responsive: true
    };

    // Adjust layout margin for large and small screens
    if (!("margin" in layout)) {
        const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        layout.margin = screenWidth <= 800 ? { r: 30, b: 30, t: 70 } : { l: 30, r: 30, b: 30, t:10 };
    }

    // Ensure transition options are in the layout for smooth updates
    layout.transition = {
        duration: transitionOptions.duration || 500,
        easing: transitionOptions.easing || 'cubic-in-out'
    };

    // Check if the chart already exists for efficient updates
    if (!onlyRender && document.getElementById(chartId) && document.getElementById(chartId).data) {
        // Use Plotly.react for smoother updates with transitions
        Plotly.react(chartId, data, layout, config);
    } else {
        // Initial rendering of the chart
        Plotly.newPlot(chartId, data, layout, config);
    }
}

function updateValuationWaterfallChart(data) {
    const { preMoneyValuation, postMoneyValuation, amountRaised, warrantAmount  } = data;

    const trace = {
        type: 'waterfall',
        orientation: 'v',
        measure: ['absolute', 'relative', 'relative', 'total'],
        x: ['Pre-Money', 'Equity Round', 'Warrant Exercise', 'Post-Money'],
        y: [preMoneyValuation, amountRaised, warrantAmount, postMoneyValuation],
        text: [
            formatToCurrency(preMoneyValuation, 0, true),
            formatToCurrency(amountRaised, 0, true),
            formatToCurrency(warrantAmount, 0, true),
            formatToCurrency(postMoneyValuation, 0, true)
        ],
        textposition: 'outside',
        connector: {
            line: {
                color: 'rgb(63, 63, 63)'
            }
        },
        decreasing: { marker: { color: '#d62728' } },
        increasing: { marker: { color: '#2ca02c' } },
        totals: { marker: { color: '#8434B4' } }
    };

    const layout = {
        showlegend: false,
        plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot background
        paper_bgcolor: 'rgba(0,0,0,0)',  // Transparent paper background
        yaxis: {
            title: '', 
            showgrid: false,
            showticklabels: false, 
            automargin: false,
            range: [0, Math.max(preMoneyValuation, postMoneyValuation, amountRaised, warrantAmount) * 1.1]
        },
        xaxis: {
            tickfont: {size: 11}
        }
    };

    renderOrUpdatePlot('valuationWaterfallChart', [trace], layout);
}

function updateOwnershipDilutionChart(data) {
    const founderOwnershipBefore = data.founderOwnershipBefore * 100; // percentage
    const founderOwnershipAfter = data.founderOwnershipAfter * 100; // percentage
    const dilutionFromFundraising = data.dilutionFromFundraising * 100; // percentage from fundraising
    const dilutionFromWarrants = data.dilutionFromWarrants * 100; // percentage from warrants

    const trace = {
        type: 'waterfall',
        orientation: 'v',
        measure: ['absolute', 'relative', 'relative', 'total'], // we now have 2 relative measures (for two dilutions)
        x: ['Initial Ownership', 'Equity Round', 'Warrant Exercise', 'Final Ownership'],
        y: [founderOwnershipBefore, -dilutionFromFundraising, -dilutionFromWarrants, founderOwnershipAfter],
        text: [
            formatToPercentage(founderOwnershipBefore / 100),
            formatToPercentage(-dilutionFromFundraising / 100),
            formatToPercentage(-dilutionFromWarrants / 100),
            formatToPercentage(founderOwnershipAfter / 100)
        ],
        textposition: 'outside',
        connector: {
            line: {
                color: 'rgb(63, 63, 63)'
            } 
        },
        decreasing: { marker: { color: '#a62728' } },
        increasing: { marker: { color: '#2ca02c' } },
        totals: { marker: { color: '#8434B4' } }
    };

    const layout = {
        title: '',
        showlegend: false,
        plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot background
        paper_bgcolor: 'rgba(0,0,0,0)',  // Transparent paper background
        yaxis: { 
            title: '', 
            showgrid: false,
            showticklabels: false, 
            automargin: false,
            range: [0, founderOwnershipBefore * 1.1]
        },
        xaxis: {
            tickfont: {size: 11}
        }
    };

    renderOrUpdatePlot('ownershipDilutionChart', [trace], layout);
}

function updateValuationVsDilutionChart(scenarioResults) {
    // Extract scenario names and founder ownership percentages
    const valuations = scenarioResults.map(scenario => scenario.name);
    const founderOwnerships = scenarioResults.map(scenario => scenario.founderOwnershipAfter * 100);
    const retainedValuations = scenarioResults.map(scenario => scenario.preMoneyValuation);

    // Prepare data for Plotly
    const trace = {
        x: valuations,
        y: founderOwnerships,
        type: 'bar',
        name: 'Founder Ownership',
        marker: {
            color: valuations.map(name => name === 'Base' ? '#8434B4' : '#808080') // Purple for Base, Grey for others
        },
        text: founderOwnerships.map(ownership => `${ownership.toFixed(2)}%`), // Display percentage labels
        textposition: 'outside',
        hovertext: scenarioResults.map(
            (scenario, i) => `<b>${scenario.name} Scenario<br>Pre-Money:</b> ${formatToCurrency(retainedValuations[i], 2, reduce=true)}`
        ),
        hoverinfo: 'text' // This ensures the hovertext is used
    };

    // Dynamic y-axis range
    const minFounderOwnership = Math.min(...founderOwnerships);
    const maxFounderOwnership = Math.max(...founderOwnerships);
    const yAxisMin = roundToSignificantDigits(Math.max(0, minFounderOwnership - 2));
    const yAxisMax = roundToSignificantDigits(Math.min(100, maxFounderOwnership)) * 1.01;

    const layout = {
        plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot background
        paper_bgcolor: 'rgba(0,0,0,0)',  // Transparent paper background
        xaxis: {
            showline: true, // This adds the bottom axis line
            linecolor: '#333333', // You can customize the color of the axis line
            linewidth: 1, // Customize the thickness of the axis line
        },
        yaxis: {
            title: '',
            showgrid: false,
            showticklabels: false,
            automargin: false,
            range: [yAxisMin, yAxisMax]
        },
        hoverlabel: {
            align: 'left' // Left-align the hover text
        },
        showlegend: false
    };

    renderOrUpdatePlot('valuationVsDilutionChart', [trace], layout);
}

function updateNewSharesIssuedChart(data) {
    // Step 1: Get the required values from the calculations
    const { initialNumberOfShares, newSharesIssued, warrantsIssued, founderOwnershipBefore } = data;

    // Calculate Founder Shares after fundraising and warrant exercise
    const founderShares = initialNumberOfShares * founderOwnershipBefore;

    // Calculate Existing Shareholders (Non-founder shares before any new shares are issued)
    const existingShareholders = initialNumberOfShares - founderShares;

    // Total number of shares after fundraising and warrant exercise
    const totalSharesAfter = initialNumberOfShares + newSharesIssued + warrantsIssued;

    // Labels for the chart
    const labels = ['Founder', 'Other Shareholders', 'New Equity', 'Warrant Shares'];

    // Values for the chart (the four slices)
    const valuesChart = [
        founderShares,                           // Founder
        existingShareholders,                    // Existing Shareholders
        newSharesIssued,                         // New Equity Shares
        warrantsIssued                    // Warrant Shares
    ];

    // Step 2: Configure the data for the pie chart
    const trace = [{
        values: valuesChart,
        labels: labels,
        type: 'pie',
        rotation: -150,
        textinfo: 'label+percent',
        textposition: 'outside',                  // Keep labels outside the slices
        hoverinfo: 'label+value+percent',
        insidetextorientation: 'horizontal',      // Ensure labels are horizontal
        marker: {
            colors: ['#8434B4', '#ce93d8', '#90a4ae', '#314047'] // Assign distinct colors
        },
        sort: false,
    }];

    // Step 3: Define the layout for the pie chart
    const layout = {
        showlegend: false,
        plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot background
        paper_bgcolor: 'rgba(0,0,0,0)',  // Transparent paper background
        margin: { t: 40, r: 40, b: 40, l: 40 },
    };

    // Step 4: Render or update the pie chart using Plotly
    renderOrUpdatePlot('newSharesIssuedChart', trace, layout);
}

function updateScenarioResultsGrid(scenarioResults) {
    scenarioResults.forEach(scenario => {
        const scenarioName = scenario.name; // 'Pessimistic', 'Base', 'Optimistic'

        metrics.forEach(metric => {
            const metricKey = metric.key;
            let value = scenario[metricKey];

            // Format the value based on the metric
            if (['preMoneyValuation', 'initialNumberOfShares', 'amountRaised', 'newSharesIssued', 'pricePerShare', 'warrantAmount', 'warrantsIssued', 'warrantExercisePrice', 'postMoneyValuation'].includes(metricKey)) {
                value = formatToCurrency(value, 2, true);
            } else if (['founderOwnershipBefore', 'dilutionFromFundraising', 'dilutionFromWarrants', 'founderOwnershipAfter'].includes(metricKey)) {
                value = formatToPercentage(value / 100); // Convert back to decimal
            } else {
                value = formatNumericInput(value);
            }

            // Construct the ID of the grid-block
            const gridBlockId = `${metricKey}-${scenarioName}`;
            // Select the grid-block
            const gridBlock = document.getElementById(gridBlockId);

            if (gridBlock) {
                // Target the existing h2 element directly
                const pElement = gridBlock.querySelector('p');
                if (pElement) {
                    pElement.textContent = value; // Update the existing p element
                } else {
                    console.warn(`p element not found in grid block with ID "${gridBlockId}".`);
                }
            } else {
                console.warn(`Grid block with ID "${gridBlockId}" not found.`);
            }
        });
    });
}

/////////////////
// Error utils
/////////////////

function displayError(inputField) {
    // Highlight the input field in red
    inputField.classList.add('input-error');
}

function clearErrors() {
    // Remove error input field styles

    const errorInputs = document.querySelectorAll('.input-error');
    errorInputs.forEach(input => {
        input.classList.remove('input-error');
    });
}

//////////////////
// App handlers
//////////////////

function initializeInputs() {
    // Set initial values for all inputs to display the app result
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.type === 'number' || input.type === 'text') {
            // Set default values here
            if (input.name === 'current_ownership') {
                input.value = '40%';
            } else if (input.name === 'number_of_shares') {
                input.value = '100k';
            } else if (input.name === 'amount_to_raise') {
                input.value = '5m';
            } else if (input.name === 'pre_money_valuation') {
                input.value = '20m';
            } else if (input.name === 'exercise_price') {
                input.value = '2.00';
            } else if (input.name === 'number_of_warrants') {
                input.value = '10k';
            } else if (input.name === 'amount_of_warrants') {
                input.value = '20k';
            } else if (input.name === 'floor_price') {
                input.value = '1.50';
            } else if (input.name === 'cap_price') {
                input.value = '3.00';
            } else if (input.name === 'discount_price') {
                input.value = '20%';
            }
            
            // Initialize segmented button state (default to Fixed Price)
            handleWarrantTypeChange('fixed', setFocus = false);
        }
    });
}

function initializeApp() {
    // Set default values for inputs
    initializeInputs();

    // Attach event listeners
    attachInputListeners('.number-input.input-k', { suffix: 'k', allowNegative: true });
    attachInputListeners('.number-input.input-m', { suffix: 'm' });
    attachInputListeners('.percentage-input', { isPercentage: true });
    attachInputListeners('.number-input:not(.input-k):not(.input-m):not(.percentage-input)', {});

    // Input validator event listener
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', function(event) {
            isInputValid(input);
        });
    });

    // Handle cursor position properly
    document.addEventListener('selectionchange', function(event) {
        const input = document.activeElement;
        if (input && input.tagName === 'INPUT' && form.contains(input)) {
            handleSelectionChange(input);
        }
    });

    // Attach listeners to segmented buttons
    document.getElementById('fixedPriceButton').addEventListener('click', function() {
        handleWarrantTypeChange('fixed');
        toggleButtonState('fixedPriceButton', 'floorCapButton');
        updateResults(); 
    });    
    document.getElementById('floorCapButton').addEventListener('click', function() {
        handleWarrantTypeChange('floor_cap');
        toggleButtonState('floorCapButton', 'fixedPriceButton');
        updateResults(); 
    });

    // Initialize charts or other components if needed
    updateResults();
}

function updateResults() {
    try {
        clearErrors();
        const values = captureValues();

        const scenarioResults = computeScenarios(values);
        const baseScenario = scenarioResults.find(scenario => scenario.name === "Base");

        // Check if warrant would probably not be exercised
        if (baseScenario.exercisePrice >= baseScenario.pricePerShare) {
            displayWarning('warrantExerciseWarning', 'The warrant exercise price is higher than the price per share of the equity round. The warrant may not be exercised.');
        } else {
            hideWarning('warrantExerciseWarning');
        }

        updateOwnershipDilutionChart(baseScenario);
        updateValuationWaterfallChart(baseScenario)
        updateValuationVsDilutionChart(scenarioResults);
        updateNewSharesIssuedChart(baseScenario)
        updateScenarioResultsGrid(scenarioResults)

        // Update any other UI elements with calculation results
        // For example, display the calculated price per share
        // document.getElementById('pricePerShareDisplay').textContent = formatToCurrency(calculations.pricePerShare, 2);

    } catch (error) {
        console.error('Error updating results:', error);
    }
}

initializeApp();


