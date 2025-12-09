class API {
  constructor(baseURL = 'http://localhost:3737/api') {
    this.baseURL = baseURL;
    this.ws = null;
    this.eventHandlers = {};
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // Widget API
  async getWidgets() {
    return this.request('/widgets');
  }

  async createWidget(data) {
    return this.request('/widgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWidget(id, data) {
    return this.request(`/widgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWidget(id) {
    return this.request(`/widgets/${id}`, {
      method: 'DELETE',
    });
  }

  // WebSocket 事件
  connectWebSocket() {
    this.ws = new WebSocket('ws://localhost:3737/api/events');

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.emit('ws:connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit(data.type, data.data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('ws:error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.emit('ws:closed');
      // 重连
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }
}

const api = new API();
