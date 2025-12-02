import { connect } from 'mongoose';

console.log('Connecting to Atlas');

connect(process.env.MONGODB_URL)
    .then(() => console.log('Connected to Atlas'))
    .catch((err) => console.error('Error connecting to Atlas', err));
  