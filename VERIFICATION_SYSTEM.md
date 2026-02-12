# نظام التوثيق - Verification System

## نظرة عامة

تم إضافة نظام كامل لتوثيق الحسابات في تطبيق TikBook، يشبه نظام التوثيق في TikTok.

## المميزات

### للمستخدمين:

- إرسال طلب توثيق مع معلومات كاملة
- متابعة حالة الطلب (قيد المراجعة، مقبول، مرفوض)
- الحصول على شارة توثيق (زرقاء أو ذهبية)
- استلام إشعارات عند قبول أو رفض الطلب

### للأدمن:

- عرض جميع طلبات التوثيق
- فلترة الطلبات حسب الحالة
- البحث عن طلب معين
- عرض تفاصيل كل طلب
- قبول أو رفض الطلبات مع إضافة سبب
- إحصائيات كاملة عن التوثيق

## المكونات المضافة

### Backend

#### 1. Model: `VerificationRequest.js`

```javascript
- user: معرف المستخدم
- fullName: الاسم الكامل
- category: الفئة (مشهور، مؤثر، علامة تجارية، إلخ)
- followersCount: عدد المتابعين
- description: وصف الحساب
- socialLinks: روابط وسائل التواصل
- status: حالة الطلب (pending, approved, rejected)
- reviewedBy: الأدمن الذي راجع الطلب
- rejectionReason: سبب الرفض
```

#### 2. Controller: `verificationController.js`

- `submitVerificationRequest`: إرسال طلب توثيق جديد
- `getMyVerificationRequests`: عرض طلبات المستخدم
- `getAllVerificationRequests`: عرض جميع الطلبات (أدمن)
- `approveVerificationRequest`: قبول طلب التوثيق
- `rejectVerificationRequest`: رفض طلب التوثيق
- `deleteVerificationRequest`: حذف طلب
- `getVerificationStats`: إحصائيات التوثيق

#### 3. Routes: `verificationRoutes.js`

```
POST   /api/verification/request            - إرسال طلب توثيق
GET    /api/verification/my-requests        - طلبات المستخدم
GET    /api/verification/admin/requests     - جميع الطلبات (أدمن)
GET    /api/verification/admin/stats        - الإحصائيات
PUT    /api/verification/admin/approve/:id  - قبول طلب
PUT    /api/verification/admin/reject/:id   - رفض طلب
DELETE /api/verification/admin/:id          - حذف طلب
```

#### 4. تحديث User Model

```javascript
- isVerified: Boolean - هل الحساب موثق
- verificationBadge: String - نوع الشارة (none, blue, gold)
```

### Admin Panel

#### 1. Page: `VerificationManagement.jsx`

صفحة كاملة لإدارة التوثيق تحتوي على:

- إحصائيات في الأعلى
- فلاتر وبحث
- جدول بجميع الطلبات
- نافذة منبثقة لعرض التفاصيل
- نافذة منبثقة لرفض الطلب مع سبب

#### 2. Style: `VerificationManagement.css`

تصميم كامل متجاوب للصفحة

#### 3. Route في App.jsx

```jsx
/verification - صفحة إدارة التوثيق
```

#### 4. إضافة في Sidebar

أيقونة ورابط "التوثيق" في القائمة الجانبية

## كيفية الاستخدام

### 1. إرسال طلب توثيق (المستخدم)

```javascript
POST /api/verification/request
Authorization: Bearer {token}

Body:
{
  "fullName": "محمد أحمد",
  "category": "influencer",
  "followersCount": 50000,
  "description": "منشئ محتوى متخصص في التكنولوجيا",
  "instagramUrl": "https://instagram.com/username",
  "twitterUrl": "https://twitter.com/username",
  "websiteUrl": "https://example.com"
}
```

### 2. مراجعة الطلبات (الأدمن)

1. اذهب إلى قسم "التوثيق" في لوحة التحكم
2. شاهد الإحصائيات والطلبات المعلقة
3. اضغط على "عرض" لرؤية تفاصيل الطلب
4. اختر "قبول" أو "رفض":
   - **قبول**: اختر نوع الشارة (زرقاء/ذهبية) وأضف ملاحظات اختيارية
   - **رفض**: أدخل سبب الرفض (إجباري) وملاحظات اختيارية

### 3. الإشعارات

عند قبول أو رفض الطلب، يتلقى المستخدم إشعاراً تلقائياً:

- **قبول**: "تم قبول طلب التوثيق الخاص بك! حسابك الآن موثق ✓"
- **رفض**: "تم رفض طلب التوثيق الخاص بك. السبب: {reason}"

## API Endpoints للمطورين

### User Endpoints

#### إرسال طلب توثيق

```http
POST /api/verification/request
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "string",
  "category": "celebrity|influencer|brand|organization|government|other",
  "followersCount": number,
  "description": "string",
  "instagramUrl": "string",
  "twitterUrl": "string",
  "facebookUrl": "string",
  "websiteUrl": "string"
}

Response: 201
{
  "message": "Verification request submitted successfully",
  "request": {...}
}
```

#### عرض طلباتي

```http
GET /api/verification/my-requests
Authorization: Bearer {token}

Response: 200
[
  {
    "_id": "...",
    "status": "pending|approved|rejected",
    "createdAt": "...",
    ...
  }
]
```

### Admin Endpoints

#### عرض جميع الطلبات

```http
GET /api/verification/admin/requests?status=pending
Authorization: Bearer {adminToken}

Response: 200
[
  {
    "_id": "...",
    "user": {...},
    "status": "pending",
    ...
  }
]
```

#### إحصائيات التوثيق

```http
GET /api/verification/admin/stats
Authorization: Bearer {adminToken}

Response: 200
{
  "totalRequests": 100,
  "pendingRequests": 20,
  "approvedRequests": 60,
  "rejectedRequests": 20,
  "verifiedUsers": 60
}
```

#### قبول طلب

```http
PUT /api/verification/admin/approve/:id
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "badgeType": "blue|gold",
  "adminNotes": "string"
}

Response: 200
{
  "message": "Verification request approved successfully",
  "request": {...}
}
```

#### رفض طلب

```http
PUT /api/verification/admin/reject/:id
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "rejectionReason": "string (required)",
  "adminNotes": "string (optional)"
}

Response: 200
{
  "message": "Verification request rejected",
  "request": {...}
}
```

#### حذف طلب

```http
DELETE /api/verification/admin/:id
Authorization: Bearer {adminToken}

Response: 200
{
  "message": "Verification request deleted successfully"
}
```

## الفئات المتاحة

- `celebrity` - مشهور
- `influencer` - مؤثر
- `brand` - علامة تجارية
- `organization` - منظمة
- `government` - حكومي
- `other` - أخرى

## أنواع الشارات

- `blue` - شارة زرقاء (عادية)
- `gold` - شارة ذهبية (مميزة/VIP)
- `none` - بدون شارة

## ملاحظات مهمة

1. **يجب إعادة تشغيل الباكند** بعد التحديثات:

   ```bash
   cd backend
   node server.js
   ```

2. **لا يمكن للمستخدم إرسال طلب جديد** إذا كان لديه طلب معلق

3. **الحسابات الموثقة** لا يمكنها إرسال طلب توثيق جديد

4. **الإشعارات** ترسل تلقائياً للمستخدم عند قبول أو رفض الطلب

5. **البيانات المطلوبة** عند إرسال الطلب:
   - الاسم الكامل
   - الفئة
   - عدد المتابعين
   - الوصف

6. **سبب الرفض إجباري** عند رفض الطلب

## التطوير المستقبلي

يمكن إضافة:

- رفع مستندات التوثيق (ID، إثبات هوية)
- نظام تقييم تلقائي بناءً على معايير معينة
- تاريخ كامل لجميع طلبات المستخدم
- إمكانية إلغاء التوثيق
- تجديد التوثيق سنوياً
- مستويات توثيق متعددة

## الدعم الفني

إذا واجهت أي مشاكل:

1. تأكد من إعادة تشغيل الباكند
2. تحقق من صلاحيات الأدمن
3. راجع logs الباكند للأخطاء
4. تأكد من أن المستخدم لديه token صالح

---

تم التطوير بواسطة GitHub Copilot
التاريخ: فبراير 2026
