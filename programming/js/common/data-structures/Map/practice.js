// const map = new Map();

// map.set('name', 'John');
// map.set('age', 30);
// map.set('city', 'New York');

// console.log(map.get('name'));
// console.log(map.get('age'));
// console.log(map.get('city'));

// map.delete('city');
// console.log(map.get('city'));

const obj1 = {1: 1};
const obj2 = {2: 2};

const entries = [
  ['name', 'John'],
  ['age', 30],
  ['city', 'New York'],
  [obj1, obj2],
];

const map = new Map(entries);

console.log(map.get('name'));
console.log(map.get('age'));
console.log(map.get('city'));
console.log(map.get(obj1));