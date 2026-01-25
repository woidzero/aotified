$("#sortDrop").on("click", ".criticSort", function (e) {
    e.preventDefault();
    e.stopPropagation();

    const $btn = $(this);
    if (this.disabled) return;

    const $li = $btn.closest("li");
    const sort = $btn.attr("sort");

    $("#sortDrop li").removeAttr("class")
        .find("button").prop("disabled", false);

    $li.addClass("current");
    $btn.prop("disabled", true);

    const $reviews = $("#criticReviewContainer .albumReviewRow");

    const sorted = $reviews.get().sort((a, b) => {
        const $a = $(a), $b = $(b);
        const dateAStr = $a.find(".albumReviewLinks .actionContainer:has(.date)").attr("title");
        const dateBStr = $b.find(".albumReviewLinks .actionContainer:has(.date)").attr("title");
        const dateA: number = dateAStr ? Number(new Date(dateAStr)) : 0;
        const dateB: number = dateBStr ? Number(new Date(dateBStr)) : 0;

        if (sort === "highest") {
            return parseInt($b.find(".albumReviewRating").text()) - parseInt($a.find(".albumReviewRating").text());
        }
        if (sort === "lowest") {
            return parseInt($a.find(".albumReviewRating").text()) - parseInt($b.find(".albumReviewRating").text());
        }
        if (sort === "newest") {
            return dateB - dateA;
        }
        if (sort === "oldest") {
            return dateA - dateB;
        }
        return 0;
    });

    $("#criticReviewContainer").empty().append(sorted);
});
