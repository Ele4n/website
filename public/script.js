// Alert button functionality
document.getElementById('alertButton').addEventListener('click', () => {
    alert('Button clicked!');
});

// Fetch data from the server
fetch('/api/data')
    .then((response) => response.json())
    .then((data) => {
        const dataDiv = document.getElementById('dataDisplay');
        dataDiv.innerHTML = `
            <h2>Data from Server:</h2>
            <p>Message: ${data.message}</p>
            <p>Timestamp: ${data.timestamp}</p>
        `;
    })
    .catch((error) => console.error('Error fetching data:', error));

// Fetch random string from the server
fetch('/api/random-string')
    .then((response) => response.json())
    .then((data) => {
        const randomStringDiv = document.getElementById('randomStringDisplay');
        randomStringDiv.innerHTML = `
            <h2>Random String from Server:</h2>
            <p>Random String: ${data.randomString}</p>
            <p>Length: ${data.length}</p>
        `;
    })
    .catch((error) => console.error('Error fetching random string:', error));

// Event listener for generating random string with specified length
document.getElementById('generateStringButton').addEventListener('click', () => {
    const length = document.getElementById('stringLength').value || 10;
    fetch(`/api/random-string?length=${length}`)
        .then((response) => response.json())
        .then((data) => {
            const userRandomStringDiv = document.getElementById('userRandomStringDisplay');
            if (data.error) {
                userRandomStringDiv.innerHTML = `<p style="color:red;">Error: ${data.error}</p>`;
            } else {
                userRandomStringDiv.innerHTML = `
                    <h3>Your Random String:</h3>
                    <p>Random String: ${data.randomString}</p>
                    <p>Length: ${data.length}</p>
                `;
            }
        })
        .catch((error) => console.error('Error fetching random string:', error));
});

// Send forgot password token
function sendForgotPassword() {
    // Get the email value
    const emailVal = document.getElementById('email').value.trim();

    // Send a POST request to the server
    fetch('/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailVal })
    })
    .then(response => {
        if (response.ok) {
            alert('Password reset email sent');
        } else {
            alert('Error sending password reset email');
        }
    })
    .catch(error => console.error('Error:', error));
}

// Forgot password validation
function forgot_password() {
    let errors = [];
    let email = document.getElementById('email').value;
    let errorElement = document.getElementById('errors');

    // Validate email
    if (email.trim() === '') {
        errors.push("Email is required.");
    } else if (!email.includes('@')) {
        errors.push("Email must be valid.");
    }

    // Display errors, if any
    if (errors.length > 0) {
        errorElement.innerText = errors.join(", ");
        return false; // Prevent form submission
    }

    // If no errors, send the forgot password request
    sendForgotPassword();
    return false; // Prevent default form submission
}

// Login validation
function Login() {
    document.getElementById('registrationform').onsubmit = function(event) {
        event.preventDefault();
    };
    let errors = [];
    let email = document.getElementById('Email').value;
    let password = document.getElementById('Password').value;
    let errorElement = document.getElementById('errors');

    // Validate email
    if (email.trim() === '') {
        errors.push("Email is required.");
    } else if (!email.includes('@')) {
        errors.push("Email must be valid.");
    }

    // Validate password
    if (password.trim().length < 10) {
        errors.push("Password must be at least 10 characters long.");
    }

    // Display errors or submit the form
    if (errors.length > 0) {
        errorElement.innerHTML = errors.join('<br>');
    } else {
        errorElement.innerHTML = "Registration successful!";
        document.getElementById('registrationform').reset();
    }
}

// Signup validation
function signup() {
    let errors2 = [];
    let password2 = document.getElementById('password').value;
    let confirmPassword = document.getElementById('confirm_password').value;
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    // Check password length
    if (password2.trim().length < 8) {
        errors2.push("Password must be at least 8 characters long.");
    }

    // Check password complexity
    if (!complexityRegex.test(password2)) {
        errors2.push("Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.");
    }

    // Check if password and confirm password match
    if (password2 !== confirmPassword) {
        errors2.push("Passwords do not match.");
    }

    // Display errors if any
    if (errors2.length > 0) {
        document.getElementById('errors').innerText = errors2.join(", ");
        return false; // Prevent form submission
    }
    return true; // Allow form submission
}

// Forgot password validation
function forgot_password() {
    let errors3 = [];
    let email2 = document.getElementById('email2').value;
    let errorElement = document.getElementById('errors');

    // Validate email
    if (email2.trim() === '') {
        errors3.push("Email is required.");
    } else if (!email2.includes('@')) {
        errors3.push("Email must be valid.");
    }

    // Display errors, if any
    if (errors3.length > 0) {
        document.getElementById('errors').innerText = errors3.join(", ");
        return false; // Prevent form submission
    }
    sendForgotPassword();
    return true; // Allow form submission
}

// Show custom alert
function showAlert() {
    alert('Hello and welcome from our Sign Up Page!!');
}
