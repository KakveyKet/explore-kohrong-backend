import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function configureSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user || user.status !== 'ACTIVE') return next(new Error('Invalid account'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    if (['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(socket.user.role)) socket.join('admins');
    if (socket.user.role === 'CUSTOMER') socket.join(`customer:${socket.user._id}`);
    socket.emit('socket:ready', { userId: socket.user._id, role: socket.user.role });
  });
}
