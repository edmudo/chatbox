$(document).ready(
    function() {
        $("#login-form").submit(
            function(event) {
                sendLogin();
                event.preventDefault();
            }
        );
        $("#signup-form").submit(
            function(event) {
                sendSignup();
                event.preventDefault();
            }
        )
    }
);

function sendLogin() {
    $.ajax(
        {
            method: "POST",
            url: "http://localhost:8080/login",
            data: $("#login-form").serialize()
        }
    )
        .done(function(data, textStatus, jqxhr) {
            var responseLink = jqxhr.getResponseHeader("x-chatbox-location");
            console.log(responseLink);
            if(responseLink === null) {
                $("#failed-login-message").toggle(true);
            } else {
                window.location.replace(jqxhr.getResponseHeader("x-chatbox-location"));
            }
        })
}

function sendSignup() {
    $.ajax(
        {
            method: "POST",
            url: "http://localhost:8080/create_account",
            data: $("#signup-form").serialize()
        }
    )
        .done(function(data, textStatus, jqxhr) {
            var responseLink = jqxhr.getResponseHeader("x-chatbox-location");
            console.log(responseLink);
            if(responseLink === null) {
                $("#failed-login-message").toggle(true);
            } else {
                window.location.replace(jqxhr.getResponseHeader("x-chatbox-location"));
            }
        });
}
