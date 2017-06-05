$(document).ready(
    function () {
        var $userOptions = $("#user-options");
        var $userOptionsMenu = $userOptions.find("ul");

        $userOptions.find("input").click(
            function (event) {
                $userOptionsMenu.toggle();
                event.stopPropagation();
            }
        );

        $("body").click(
            function () {
                if($userOptionsMenu.css("display") !== "none") {
                    $userOptionsMenu.toggle();
                }
            }
        );
    }
);
