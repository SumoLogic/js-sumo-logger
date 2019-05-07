function formatDate(date) {
    const timezone = JSON.stringify(date).split("GMT")[1] || "+000";
    const asJson = date.toJSON().split(".")[0];

    return `${asJson}${timezone}`;
}

module.exports = formatDate;
