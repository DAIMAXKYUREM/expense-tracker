import app from '../../server.js';

export default async (req: any, res: any) => {
    return new Promise((resolve) => {
        app(req, res);
        res.on('finish', () => resolve(res));
    });
};

export const handler = async (event: any, context: any) => {
    const req = {
        method: event.httpMethod,
        path: event.path,
        headers: event.headers,
        body: event.body,
    };

    const res = {
        statusCode: 200,
        headers: {},
        body: '',
        json: function(data: any) {
            this.body = JSON.stringify(data);
            return this;
        },
        status: function(code: number) {
            this.statusCode = code;
            return this;
        },
        send: function(data: any) {
            this.body = data;
            return this;
        },
        sendFile: function(path: string) {
            // Netlify handles this differently
            this.body = 'File not found';
            this.statusCode = 404;
            return this;
        },
    };

    await new Promise((resolve) => {
        res.on = () => {};
        app(req, res);
        resolve(null);
    });

    return {
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body,
    };
};