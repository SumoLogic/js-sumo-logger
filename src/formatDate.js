function formatDate(date) {
    // Per https://stackoverflow.com/a/31096160/2702, stringify on a Date calls
    // date.toISOString rather than date.toString(), which is what's needed to preserve timestamp
    const timezone = JSON.stringify(date.toString()).split('GMT')[1] || '+000';
    const asJson = date.toJSON().split('.')[0];

    return `${asJson}${timezone}`;
}

module.exports = formatDate;
