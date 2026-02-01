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

(function () {
  const $box = $(".addCoverBox");
  if (!$box.length) return;

  const input = $box.find('input[type="file"]')[0];
  if (!input) return;

  $box.addClass("aotified-dropzone");

  // визуальный hover
  $box.on("dragenter dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $box.addClass("aotified-dragover");
  });

  $box.on("dragleave dragend drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $box.removeClass("aotified-dragover");
  });

  $box.on("drop", function (e) {
    const files = e.originalEvent?.dataTransfer?.files;
    if (!files || !files.length) return;

    const dt = new DataTransfer();
    for (const file of files) {
      dt.items.add(file);
    }

    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

})();

// @ts-ignore
window.toggle_visibility = function(id, id2) {
  const e = document.getElementById(id);
  const s = document.getElementById(id2);

  if (e) e.style.display = (e.style.display === 'block') ? 'none' : 'block';
  if (s) s.style.display = (s.style.display === 'block') ? 'none' : 'block';
};

// @ts-ignore
window.ga = function() {
  return false
};