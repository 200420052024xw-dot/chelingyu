// Generated from user-mock-data.json. Run npm run build:miniprogram after editing the JSON.
module.exports = {
  "_comment": "在这里修改你想演示的车辆/地址/价格等数据。删掉文件 = 回落到 seed.ts 默认值。每个字段都可以单独保留或删掉，未提供的字段会自动沿用默认值。详细字段说明见 docs/MOCK_DATA.md。",
  "region": {
    "label": "南昌·瑶湖校区",
    "sub": "江西师范大学瑶湖校区",
    "center": {
      "latitude": 28.6829,
      "longitude": 115.8582
    },
    "radiusMeters": 3000
  },
  "demoUser": {
    "nickname": "测试用户",
    "avatarText": "我",
    "mobileMasked": "138****0000"
  },
  "addresses": [
    {
      "id": "addr_library",
      "name": "江西师范大学（瑶湖校区）图书馆",
      "detail": "江西师范大学瑶湖校区图书馆",
      "latitude": 28.6829,
      "longitude": 115.8582,
      "contactName": "测试用户",
      "contactMobile": "138****0000",
      "isDefaultSender": true,
      "isDefaultReceiver": false,
      "label": "school"
    },
    {
      "id": "addr_stadium_east",
      "name": "瑶湖体育场东门",
      "detail": "瑶湖体育场东门",
      "latitude": 28.6841,
      "longitude": 115.8711,
      "contactName": "测试用户",
      "contactMobile": "138****0000",
      "isDefaultSender": false,
      "isDefaultReceiver": true,
      "label": "school"
    },
    {
      "id": "addr_dorm_5",
      "name": "学生公寓 5 号楼",
      "detail": "学生公寓 5 号楼",
      "latitude": 28.6798,
      "longitude": 115.8539,
      "contactName": "测试用户",
      "contactMobile": "138****0000",
      "isDefaultSender": false,
      "isDefaultReceiver": false,
      "label": "school"
    }
  ],
  "vehicles": [
    {
      "id": "veh_001",
      "vehicleNo": "CLY-NC-001",
      "modelId": "z2",
      "ownerShared": true,
      "status": "available",
      "latitude": 28.6852,
      "longitude": 115.8612,
      "batteryPercent": 78,
      "remainingRangeMeters": 35000,
      "imagePath": "/assets/vehicles/autonomous-truck.png"
    },
    {
      "id": "veh_002",
      "vehicleNo": "CLY-NC-002",
      "modelId": "z5-2026",
      "ownerShared": true,
      "status": "available",
      "latitude": 28.6804,
      "longitude": 115.8635,
      "batteryPercent": 65,
      "remainingRangeMeters": 28000,
      "imagePath": "/assets/vehicles/autonomous-truck.png"
    },
    {
      "id": "veh_003",
      "vehicleNo": "CLY-NC-003",
      "modelId": "z5-c",
      "ownerShared": true,
      "status": "available",
      "latitude": 28.6778,
      "longitude": 115.8501,
      "batteryPercent": 82,
      "remainingRangeMeters": 42000,
      "imagePath": "/assets/vehicles/autonomous-truck.png"
    },
    {
      "id": "veh_004",
      "vehicleNo": "CLY-NC-004",
      "modelId": "z2",
      "ownerShared": true,
      "status": "available",
      "latitude": 28.684,
      "longitude": 115.86,
      "batteryPercent": 60,
      "remainingRangeMeters": 30000,
      "imagePath": "/assets/vehicles/autonomous-truck.png"
    },
    {
      "id": "veh_005",
      "vehicleNo": "CLY-NC-005",
      "modelId": "z5-2026",
      "ownerShared": true,
      "status": "available",
      "latitude": 28.6868,
      "longitude": 115.8558,
      "batteryPercent": 15,
      "remainingRangeMeters": 6000,
      "imagePath": "/assets/vehicles/autonomous-truck.png"
    },
    {
      "id": "veh_006",
      "vehicleNo": "CLY-NC-006",
      "modelId": "z2",
      "ownerShared": false,
      "status": "available",
      "latitude": 28.681,
      "longitude": 115.866,
      "batteryPercent": 72,
      "remainingRangeMeters": 32000,
      "imagePath": "/assets/vehicles/autonomous-truck.png"
    }
  ],
  "availability": [
    {
      "vehicleId": "veh_001",
      "weekdays": [
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      "startTime": "08:00",
      "endTime": "22:00"
    },
    {
      "vehicleId": "veh_002",
      "weekdays": [
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      "startTime": "08:00",
      "endTime": "22:00"
    },
    {
      "vehicleId": "veh_003",
      "weekdays": [
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      "startTime": "06:00",
      "endTime": "23:00"
    },
    {
      "vehicleId": "veh_004",
      "weekdays": [
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      "startTime": "08:00",
      "endTime": "22:00"
    },
    {
      "vehicleId": "veh_005",
      "weekdays": [
        1,
        2,
        3,
        4,
        5
      ],
      "startTime": "09:00",
      "endTime": "18:00"
    },
    {
      "vehicleId": "veh_006",
      "weekdays": [
        1,
        2,
        3,
        4,
        5,
        6,
        7
      ],
      "startTime": "08:00",
      "endTime": "22:00"
    }
  ],
  "pricing": {
    "name": "瑶湖校区标准配送价格",
    "minimumOrderAmountFen": 500,
    "maximumOrderAmountFen": 150000,
    "baseFeeFen": 500,
    "includedDistanceMeters": 0,
    "extraDistanceFeeFenPerKm": 200
  },
  "revenueSharing": {
    "name": "瑶湖校区默认分润",
    "shares": [
      {
        "recipientType": "platform",
        "basisPoints": 1000
      },
      {
        "recipientType": "city_operator",
        "basisPoints": 500
      },
      {
        "recipientType": "district_operator",
        "basisPoints": 500
      },
      {
        "recipientType": "vehicle_owner",
        "basisPoints": 8000
      }
    ]
  },
  "notifications": [
    {
      "id": "notif_001",
      "type": "system",
      "title": "欢迎使用无人车共享运力",
      "content": "可在首页查看附近车辆，并按需创建订单",
      "readAt": null
    },
    {
      "id": "notif_002",
      "type": "order",
      "title": "订单状态更新",
      "content": "请前往「订单」查看历史与履约时间线",
      "readAt": "2026-09-22T08:30:00+08:00"
    }
  ]
};
