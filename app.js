App = Ember.Application.create();

App.ApplicationRoute = Ember.Route.extend({
  model: function() {
    return findGroups();
  }
});

/*************************************************************/

var currentDrag;
var lastEntered;

Ember.$(document).on('dragstart', function(event) {
  currentDrag = event.target;
});

Ember.$(document).on('dragenter', function(event) {
  lastEntered = event.target;
});


var Droppable = Ember.Mixin.create({

  canAccept: function(event) {
    return true;
  },

  classNameBindings: ['acceptsDrag'],

  acceptsDrag: false,

  dragOver: function(event) {
    if (this.get('acceptsDrag')) return this.allowDrop(event);
    if (this.droppableIsDraggable(event)) return;
    if (this.canAccept(event)) {
      this.set('acceptsDrag', true);
      return this.allowDrop(event);
    }
  },

  dragLeave: function() {
    // TODO: stopPropagation or no?
    this.resetDroppability();
  },

  drop: function(event) {
    this.acceptDrop(event);
    this.resetDroppability();
    event.stopPropagation();
    return false;
  },

  allowDrop: function(event) {
    event.stopPropagation();
    event.preventDefault();
    return false;
  },

  droppableIsDraggable: function(event) {
    return currentDrag && (
      currentDrag === event.target ||
      currentDrag.contains(event.target)
    );
  },

  resetDroppability: function() {
    this.set('acceptsDrag', false);
  }

});

/******************************************************************/


App.ApplicationView = Ember.View.extend({});


App.MyGroupComponent = Ember.Component.extend(Droppable, {
  attributeBindings: ['draggable'],
  draggable: "true",

  canAccept: function(event) {
    return true;
    //return event.dataTransfer.types.contains('text/x-item');
  },

  acceptDrop: function(event) {
    var data = JSON.parse(event.dataTransfer.getData('text/x-item'));
    var myGroup = this.get('model');
    var dragGroup = findGroup(data.group_id);
    if (myGroup === dragGroup) {
      console.debug('same group, should reorder', this.get('elementId'));
      return;
    }
    var dragItem = dragGroup.items.findBy('id', data.id);
    Ember.run.next(null, function() {
      moveItem(dragItem, dragGroup, myGroup);
    });
  }
});

App.XSortableComponent = Ember.Component.extend({

  model: null

});

App.XSortableItemComponent = Ember.Component.extend(Droppable, {

  attributeBindings: ['draggable'],

  draggable: "true",

  classNameBindings: [
    'isDragging',
    'dropBelow',
    'dropAbove'
  ],

  isDragging: false,

  dropBelow: false,

  dropAbove: false,

  canAccept: function(event) {
    return event.dataTransfer.types.contains('text/x-item');
  },

  acceptDrop: function(event) {
    console.log('DRRRRRRRRRRRRRROOPP');
  },

  setDropBelow: function() {
    // TODO: check index of siblings, don't do anything
    this.set('dropBelow', true);
    this.set('dropAbove', false);
  },

  setDropAbove: function() {
    // TODO: check index of siblings, don't do anything
    this.set('dropAbove', true);
    this.set('dropBelow', false);
  },

  decideToAddClassForDropAboveOrBelow: function(event) {
    if (!this.get('acceptsDrag')) return;
    var pos = relativeClientPosition(this.$()[0], event.originalEvent);
    if (this.get('dropBelow')) {
      if (pos.py < 0.33) {
        this.setDropAbove();
      }
    } else if (this.get('dropAbove')) {
      if (pos.py > 0.66) {
        this.setDropBelow();
      }
    } else {
      if (pos.py < .5) {
        this.setDropAbove();
      } else {
        this.setDropBelow();
      }
    }
  }.on('dragOver'),

  resetDropProps: function() {
    this.set('dropAbove', false);
    this.set('dropBelow', false);
  },

  resetDropPropsOnDrop: function() {
    this.resetDropProps();
  }.on('drop'),

  resetDropPropsOnLeave: function(event) {
    var el = this.get('element');
    // TODO: what about nested sortables, huh? did you ever think about that? HUH? WELL? DID YOU?!
    if (el !== lastEntered && !el.contains(lastEntered)) {
      this.resetDropProps();
    }
  }.on('dragLeave'),

  initDragStart: function(event) {
    var data = JSON.stringify(this.get('model'));
    event.dataTransfer.setData('text/x-item', data);
    Ember.run.next(this, 'set', 'isDragging', true);
  }.on('dragStart'),

  resetOnDragEnd: function() {
    this.set('isDragging', false);
  }.on('dragEnd')

});

function relativeClientPosition(el, event) {
  var rect = el.getBoundingClientRect();
  var x = event.clientX - rect.left;
  var y = event.clientY - rect.top;
  return {
    x: x,
    y: y,
    px: x / rect.width,
    py: y / rect.height
  };
}


App.IconDocumentComponent = Ember.Component.extend({
  attributeBindings: ['width', 'height'],
  tagName: 'icon-document',
  width: 16,
  height: 16
});


var groups = Ember.ArrayProxy.create({
  sortProperties: ['sort'],
  content: [
    {
      id: 0,
      name: 'A',
      items: [
        {sort: 0, group_id: 0, id: 1, name: 'foo'},
        {sort: 1, group_id: 0, id: 0, name: 'bar'},
        {sort: 2, group_id: 0, id: 2, name: 'baz'}
      ]
    },
    {
      id: 1,
      name: 'B',
      items: [
        {sort: 0, group_id: 1, id: 3, name: 'qux'}
      ]
    },

    {
      id: 2,
      name: 'C',
      items: []
    }
  ]
});

function findGroups() {
  return groups;
}

function findGroup(id) {
  return groups.findProperty('id', id);
}

function moveItem(item, from, to) {
  from.items.removeObject(item);
  item.group_id = to.id;
  to.items.addObject(item);
}

