function autoAdjustTextBox() {

    var pendingMessage = document.getElementById("pending-message");

    // Assumes that the padding is 5px
    if(pendingMessage.clientHeight >= charHeight * 3 + 10) {
        pendingMessage.style.overflow = "scroll";
    } else {
        pendingMessage.style.overflow = "hidden";

        // Clears the style
        messageBox.style.height = "1px";

        // Gets the height of content without css height influence
        var textareaScrollHeight = document.getElementById("pending-message").scrollHeight;
        messageBox.style.height = (textareaScrollHeight - 10).toString() + "px";
    }
}