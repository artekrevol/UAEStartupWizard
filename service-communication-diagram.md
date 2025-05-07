# Inter-Service Communication System Diagram

```
+--------------------+     Service Registration     +--------------------+
|                    |--------------------------->  |                    |
|                    |                              |                    |
|                    |   Service Confirmation       |                    |
|    Microservice    |  <---------------------------+    API Gateway     |
|                    |                              |                    |
|                    |   Health Check Request       |                    |
|                    |  <---------------------------|                    |
|                    |                              |                    |
|                    |   Health Status Response     |                    |
|                    |--------------------------->  |                    |
+--------------------+                              +--------------------+
        |  ^                                               |  ^
        |  |                                               |  |
        |  |                                               |  |
        |  |                                               |  |
        |  |       +-----------------------------+         |  |
        |  |       |                             |         |  |
        |  |       |      Message Bus System     |         |  |
        |  +-------+                             +---------+  |
        |          |  • Message Queue            |            |
        |          |  • Delivery Guarantees      |            |
        |          |  • Priority Handling        |            |
        +--------->+  • Error Management         +------------+
                   |  • Persistent Storage       |
                   |                             |
                   +-----------------------------+
                             |       ^
                             |       |
                             v       |
        +--------------------+       +--------------------+
        |                    |       |                    |
        |                    |       |                    |
        |                    |       |                    |
        |    Microservice    |<----->|    Microservice    |
        |                    |Direct |                    |
        |                    |Comms  |                    |
        |                    |       |                    |
        +--------------------+       +--------------------+
```

## Message Flow Example

```
+----------------+     +----------------+     +----------------+
| User Service   |     | API Gateway    |     | Document Svc   |
+----------------+     +----------------+     +----------------+
        |                      |                      |
        |  service.register    |                      |
        |--------------------->|                      |
        |                      |                      |
        |                      |  service.register    |
        |                      |<---------------------|
        |                      |                      |
        |  service.registered  |                      |
        |<---------------------|                      |
        |                      |  service.registered  |
        |                      |--------------------->|
        |                      |                      |
        |                      |                      |
        |                      |                      |
        |       document.created (broadcast)          |
        |<-------------------------------------------|
        |                      |                      |
        | Handle document      |                      |
        | notification         |                      |
        |                      |                      |
        |                      |                      |
        | user.updated         |                      |
        |------------------------------------------>  |
        |                      |                      |
        |                      |                      | Handle user 
        |                      |                      | update
        |                      |                      |
```

## Error Handling Flow

```
+----------------+     +----------------+     +----------------+
| Service A      |     | Message Bus    |     | Service B      |
+----------------+     +----------------+     +----------------+
        |                      |                      |
        | Send Message         |                      |
        |--------------------->|                      |
        |                      | Delivery Attempt     |
        |                      |--------------------->|
        |                      |                      | Service 
        |                      |                      | Unavailable
        |                      | Retry (1)            |
        |                      |--------------------->|
        |                      |                      | Still
        |                      |                      | Unavailable
        |                      |                      |
        |                      | Store Message        |
        |                      | (If Critical)        |
        |                      |                      |
        |                      | Wait with            |
        |                      | Backoff              |
        |                      |                      |
        |                      | Retry (2)            |
        |                      |--------------------->|
        |                      |                      |
        |                      |                      | Success
        |                      | Delivery Confirmed   |
        |                      |<---------------------|
        |                      |                      |
        | Notification of      |                      |
        | Successful Delivery  |                      |
        |<---------------------|                      |
        |                      |                      |
```

## Priority Levels and Handling

| Priority Level | Retry Attempts | Storage | Use Cases |
|----------------|---------------|---------|-----------|
| LOW | 1 | Memory Only | Non-critical notifications, status updates |
| NORMAL | 3 | Memory Only | Standard service-to-service communication |
| HIGH | 10 | Memory Only | Important operations, user-initiated actions |
| CRITICAL | Unlimited | Disk Persistence | Security alerts, data integrity issues |