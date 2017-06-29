$(document).ready(
    function() {
        $("#login-form").submit(
            function(event) {
                sendLogin();
                event.preventDefault();
            }
        );
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
            if(jqxhr.getResponseHeader("Location") === null) {
                $("#failed-login-message").toggle(true);
            }
        })

}
