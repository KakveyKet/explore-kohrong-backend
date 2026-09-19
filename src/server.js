import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { configureSockets } from './sockets/index.js';

const port = Number(process.env.PORT || 5000);
await connectDB();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:5173'], credentials: true },
});
app.set('io', io);
configureSockets(io);
server.listen(port, () => console.log(`API + Socket.IO running on http://localhost:${port}`));
