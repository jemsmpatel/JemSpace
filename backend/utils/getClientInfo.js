import geoip from 'geoip-lite';

export const getClientInfo = (req) => {

    let ip =
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket.remoteAddress ||
        req.ip;

    // 🧹 clean IPv6 format (::ffff:127.0.0.1)
    if (ip && ip.includes('::ffff:')) {
        ip = ip.replace('::ffff:', '');
    }

    const geo = geoip.lookup(ip);

    return {
        ip,
        location: geo
            ? `${geo.city || 'Unknown'}, ${geo.country}`
            : 'Unknown'
    };
};