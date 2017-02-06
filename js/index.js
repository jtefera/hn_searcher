var commentsIds = [];
var comments = [];
var visibleComments = [];
var totalComments = 0;
var deletedComments = 0;
var importedComments = 0;
var concurrentRequests = 0;
var maxNumConcurrentRequests = 20;
var nextCommentImport = 0;

// Rendering algorithms

function rerenderComments(commentsList, emphasisTerms) {
  if(commentsList === undefined) {
    visibleComments = comments;
  } else {
    visibleComments = commentsList.slice();
  }
  removeAllChilds('comments');
  var resultsText = (visibleComments.length === 0) ? 
                        'No results!' 
                        : 'Showing ' + visibleComments.length + ' of ' + (commentsIds.length - deletedComments);
  document.getElementById('results').textContent = resultsText;
  visibleComments.forEach((comment) => addCommentToUl('comments', comment, emphasisTerms));  
}

function removeAllChilds(id) {
  var element = document.getElementById(id);
  while(element.children.length) {
    element.removeChild(element.children[0]);
  }
}

function addCommentToUl(ulId, comment, emphasisTerms) {
  if(comment.deleted) {
    return;
  }
  //Element creation
  var liElement = document.createElement('li');
  liElement.setAttribute('id', comment.id);
  var titleElement = document.createElement('div');
  var authorElement = document.createElement('a');
  var dateElement = document.createElement('span');
  var textElement = document.createElement('div');
  // Text to elements
  authorElement.setAttribute('href', 'https://news.ycombinator.com/user?id=' + comment.by);
  authorElement.textContent = comment.by + ' ';
  dateElement.textContent = timeSince(comment.time * 1000);
  if(emphasisTerms && emphasisTerms.length > 0) {
    var regExpEmpasisStr = '(' + (emphasisTerms.join('|')) + ')';
    var regExpEmpahsis = new RegExp(regExpEmpasisStr, 'gi');
    textElement.insertAdjacentHTML('beforeend', comment.text.replace(regExpEmpahsis, '<b>$1</b>'));
  } else {
    textElement.insertAdjacentHTML('beforeend', comment.text);
  }
  textElement.className = 'pl-2';
  // Binding elements
  titleElement.appendChild(authorElement);
  titleElement.appendChild(dateElement);
  liElement.appendChild(titleElement);
  liElement.appendChild(textElement);
  document.getElementById(ulId).appendChild(liElement);
}

function addPostData(post) {
  var title = post.title || post.text;
  var text = post.text || '';
  var author = post.by;
  var hnUrl = 'https://news.ycombinator.com/item?id=' + post.id;
  var url = post.url || hnUrl;
  var titleLink = document.createElement('a');
  titleLink.setAttribute('href', url);
  titleLink.textContent = title;
  var time = timeSince(post.time * 1000);
  var linkAuthor = document.createElement('a');
  linkAuthor.setAttribute('href', 'https://news.ycombinator.com/user?id=' + author);
  linkAuthor.textContent = author;
  var dateSpan = document.createElement('span');
  dateSpan.textContent = ' ' + time;
  removeDisplay(document.getElementById('post'));
  document.querySelector('#post .card-subtitle').appendChild(linkAuthor);
  document.querySelector('#post .card-subtitle').appendChild(dateSpan);
  document.querySelector('#post .card-title').appendChild(titleLink);
  document.querySelector('#post .card-link').setAttribute(
    'href',
    hnUrl
  );
  document.querySelector('#post .card-text').innerHTML = (post.text) ? post.text : '';
          
}
// Sorting algorithms
function orderByTime(comment1, comment2) {
  if(comment1.time > comment2.time) return 1;
  if(comment1.time < comment2.time) return -1;
  return 0;
}

// Utils
function csvToArr(csv) {
  return csv.split(',');
}

function dateConditionalPlural(num, type) {
  if(num === 1) {
    return num + " " + type + " ago";
  } else {
    return num + " " + type + "s ago";
  }
}

function removeDisplay(node) {
  if (node.style.removeProperty) {
    node.style.removeProperty('display');
  } else {
    node.style.removeAttribute('display');
  }
}
function timeSince(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    var interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
        return dateConditionalPlural(interval, 'year');
    }
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return dateConditionalPlural(interval, 'month');
    }
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return dateConditionalPlural(interval, 'day');
    }
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return dateConditionalPlural(interval, 'hour');
    }
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return dateConditionalPlural(interval, 'minute');
    }
    return dateConditionalPlural(Math.floor(seconds), 'second');
}

function strContains(str, substr) {
  return str.toLowerCase().indexOf(substr.toLowerCase()) !== -1;
}

// Filtering functions
function hasAllMandatoryTerms(comment, terms) {
  var termsArr = (terms instanceof Array) ? terms.slice() : terms.slice(',');
  var commentStr = (typeof comment === 'object') ? comment.text : comment;
  var i;
  var term;
  if(commentStr === undefined) {
    return false;
  }
  if(termsArr.length === 0){
    return true;
  }
  for(i = 0; i < termsArr.length; i++){
    term = termsArr[i];
    if(!strContains(commentStr, term)) {
      return false;
    }
  }
  return true;
}

function hasAtLeastOneTerm(comment, terms) {
  var termsArr = (terms instanceof Array) ? terms.slice() : terms.slice(',');
  var commentStr = (typeof comment === 'object') ? comment.text : comment;
  var i;
  var term;
  if(commentStr === undefined) {
    return false;
  }
  if(termsArr.length === 0){
    return true;
  }
  for(i = 0; i < termsArr.length; i++){
    term = termsArr[i];
    if(strContains(commentStr, term)) {
      return true;
    }
  }
  return false;
}

function hasAtLeastOneTearmOfEachGroup(comment, atLeastOneTermsGroup) {
  if(atLeastOneTermsGroup.length === 0){
    return true;
  }
  if(typeof atLeastOneTermsGroup[0] === 'string') {
    return hasAtLeastOneTerm(comment, atLeastOneTermsGroup);
  }
  var i;
  for(i = 0; i < atLeastOneTermsGroup.length; i++) {
    if(!hasAtLeastOneTerm(comment, atLeastOneTermsGroup[i])) {
      return false;
    }
  }
  return true;
}

function doesntHaveThisTerms(comment, terms) {
  if(terms.length === 0 || terms[0].length === 0) {
    return true;
  }
  return !hasAtLeastOneTerm(comment, terms);
}

function wasPublishedInTheLastDays(comment, days) {
  if(!days){
    return true;
  }
  var secs = (days + 1) * 24 * 60 * 60;
  var now = Date.now() / 1000; // comment.time comes in secs while Date.now() in millis
  return comment.time > (now - secs);
}


// Dom listener
document.getElementById('filterButton').addEventListener('click', function (e) {
  e.preventDefault();
  var mandatoryTerms = document.getElementById('mandatoryTermsInput')
                        .value.split(',').map(str => str.trim()).filter(str => str.length);
  var inTheLastDays = parseInt(document.getElementById('lastDaysInput').value, 10);
  var atLeastTermsGroup = [];
  var atLeastInputs = document.getElementsByClassName('atLeastOneInput');
  var i;
  var atLeastOneTerms;
  for (i = 0; i < atLeastInputs.length; i++){
    atLeastOneTerms = atLeastInputs[i].value.split(',')
         .map(str => str.trim()).filter(str => str.length);
    if(atLeastOneTerms.length) {
      atLeastTermsGroup.push(atLeastOneTerms); 
    }
  }
  var withoutTerms = document.getElementById('withoutInput')
                  .value.split(',').map(str => str.trim());; 
  var filteredComments = comments.filter((comment) => {
    return hasAllMandatoryTerms(comment, mandatoryTerms) &&
      hasAtLeastOneTearmOfEachGroup(comment, atLeastTermsGroup) &&
      doesntHaveThisTerms(comment, withoutTerms) &&
      wasPublishedInTheLastDays(comment, inTheLastDays)
  });
  var emphasisWords = [];
  if(mandatoryTerms.length > 0) {
    emphasisWords.push.apply(emphasisWords, mandatoryTerms);
  }
  var j;
  for(j = 0; j < atLeastTermsGroup.length; j++){
    if(atLeastTermsGroup[j].length > 0) {
      emphasisWords.push.apply(emphasisWords, atLeastTermsGroup[j])
    } 
  }
  rerenderComments(filteredComments, emphasisWords);
});

document.getElementById('resetButton').addEventListener('click', function(e){
  e.preventDefault();
  document.getElementById('mandatoryTermsInput').value = '';
  removeAllChilds('atLeastOneGroup');
  addAtLeastOneInput();
  document.getElementById('withoutInput').value = '';
  document.getElementById('lastDaysInput').value = '';
  rerenderComments();
});

function addAtLeastOneInput() {
  var formGroupDiv = document.createElement('form-group');
  formGroupDiv.className = 'form-group';
  var id = 'atLeastOne-' + Date.now();
  var newInput = document.createElement('input');
  newInput.id = id;
  newInput.className = 'form-control atLeastOneInput';
  newInput.type = 'text';
  newInput.placeholder = 'SF, San Francisco, Remote'
  var labelNode = document.createElement('label');
  labelNode.setAttribute('for', id);
  labelNode.textContent = 'Some of this terms';
  formGroupDiv.appendChild(labelNode);
  formGroupDiv.appendChild(newInput);
  document.getElementById('atLeastOneGroup').appendChild(formGroupDiv);
}
document.getElementById('addAtLeast').addEventListener('click', function(e) {
  e.preventDefault();
  addAtLeastOneInput();
});

// Ajax Calls
function importNextComment() {
  if(nextCommentImport >= commentsIds.length) {
    return;
  }
  importComment(commentsIds[nextCommentImport], nextCommentImport);
  nextCommentImport++;
}

function importComment(commentId, id) {
   $.ajax({
      method: 'get',
      url: 'https://hacker-news.firebaseio.com/v0/item/' + commentId + '.json?print=pretty',
    }).done(function(data) {
      comments[id] = data;
      if(data.deleted) {
        deletedComments++;
      }
      addCommentToUl('comments', data);
      importedComments++;
      importNextComment();
      if(totalComments !== importedComments) {
        var percentage = parseInt(importedComments / totalComments * 100, 10);
        document.getElementById('progress-bar-bar').style.width = percentage + '%';
        document.getElementById('progress-bar-bar').setAttribute('aria-valuenow', percentage);
        console.log("Imported " + importedComments + " of " + totalComments + " comments.(" + percentage + "%).");
      } else {
        console.log('Last Comment imported')
        console.log(comments);
        document.getElementById('progress-bar-parent').style.display = 'none';
      }
    });
}

function getHNUrlFromGetParams() {
  var getPart = decodeURIComponent(window.location.search.substr(1));
  if(getPart.indexOf('id=') !== -1) {
    return getPart.split('id=')[1];
  }
  return null;
}

function importDataHN() {
  var idHN = getHNUrlFromGetParams();
  if(idHN && idHN.length > 0) {
    $.ajax({
      method: 'get',
      url: 'https://hacker-news.firebaseio.com/v0/item/' + idHN + '.json?print=pretty'
    }).done(function(data) {
      addPostData(data);
      commentsIds = data.kids;
      totalComments = commentsIds.length;
      removeDisplay(document.getElementById('progress-bar-parent'));
      concurrentRequests = 1;
      var i;
      for(i = 0; i < maxNumConcurrentRequests; i++) {
        importNextComment();
      }
    });
  }
}

importDataHN();