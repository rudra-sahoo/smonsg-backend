document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('popup');
    const yesButton = document.getElementById('yesButton');
    const noButton = document.getElementById('noButton');
    const popupMessage = document.getElementById('popupMessage');
    const gifContainer = document.getElementById('gifContainer');
    const gifImage = document.getElementById('gifImage');

    let questionState = 0; // 0 for "Do you love me?", 1 for "Are you sure you don't love me?"
    let noCount = 0; // Counter for the number of "No" clicks

    // Audio elements
    const alertSound = new Audio('../../uploads/alert.mp3'); // Path to your alert sound
    const errorSound = new Audio('../../uploads/error.mp3'); // Path to your error sound

    // Display the popup box immediately
    const showPopup = () => {
        popup.style.display = 'flex';
    };

    // Ensure popup is within the screen
    const adjustPopupPosition = () => {
        const popupRect = popup.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Adjust horizontal position
        if (popupRect.left < 0) {
            popup.style.left = '0px';
        } else if (popupRect.right > windowWidth) {
            popup.style.left = `${windowWidth - popupRect.width}px`;
        }

        // Adjust vertical position
        if (popupRect.top < 0) {
            popup.style.top = '0px';
        } else if (popupRect.bottom > windowHeight) {
            popup.style.top = `${windowHeight - popupRect.height}px`;
        }
    };

    // Move popup to a random position within the screen
    const movePopupRandomly = () => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const popupWidth = popup.offsetWidth;
        const popupHeight = popup.offsetHeight;

        let newLeft = Math.random() * (windowWidth - popupWidth);
        let newTop = Math.random() * (windowHeight - popupHeight);

        // Ensure the popup does not go outside the viewport
        newLeft = Math.max(0, Math.min(newLeft, windowWidth - popupWidth));
        newTop = Math.max(0, Math.min(newTop, windowHeight - popupHeight));

        popup.style.left = `${newLeft}px`;
        popup.style.top = `${newTop}px`;
    };

    // Function to request fullscreen
    const requestFullscreen = () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) { // Firefox
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari and Opera
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
            document.documentElement.msRequestFullscreen();
        }
    };

    // Initialize popup
    showPopup();
    adjustPopupPosition();

    yesButton.addEventListener('click', () => {
        // Stop any ongoing sounds
        alertSound.pause();
        errorSound.pause();
        errorSound.currentTime = 0; // Reset error sound

        // Show the GIF and hide the popup regardless of the question
        gifContainer.style.display = 'block';
        gifImage.src = '../../uploads/love.gif'; // Update this path to your actual gif location
        popup.style.display = 'none'; // Hide the popup after showing the GIF
    });

    noButton.addEventListener('click', () => {
        noCount++;
        alertSound.play();

        if (questionState === 0) {
            popupMessage.textContent = "Are you sure you don't love me?";
            questionState = 1; // Switch to the second question
        } else if (questionState === 1) {
            if (noCount >= 5) {
                alertSound.pause(); // Stop the alert sound
                errorSound.loop = true;
                errorSound.play();

                // Request fullscreen
                requestFullscreen();
            } else {
                movePopupRandomly();
                adjustPopupPosition();
            }
        }
    });
});
