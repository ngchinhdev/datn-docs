---
title: Thuật toán tính giờ trống (BT1)
description: Bài toán, mô hình dữ liệu, mã giả, 10 ví dụ tính tay cho salon và spa thú cưng, thuật toán vét cạn đối chứng cho E1.
---

> **Đã chốt 08/11/2026** cùng màn MH-45. Quy tắc tương ứng: BR-50 đến BR-59. Trang này là đầu vào cho `packages/scheduling-core` ở giai đoạn 3.

## 1. Bài toán

Cho một chi nhánh, một ngày và **một mục đặt lịch** (một biến thể dịch vụ cho một đối tượng, có thể kèm nhân viên khách chọn). Tìm mọi **giờ bắt đầu** mà khách được phép chọn. Mỗi giờ phải kèm một **phương án gán**: tài nguyên cụ thể nào làm từng phần.

Giờ bắt đầu hợp lệ khi đồng thời thỏa:

- Phần khách thấy nằm trong giờ mở cửa của chi nhánh. Ngày đặc biệt thay giờ thường lệ (BR-02).
- Mỗi loại tài nguyên mà dịch vụ cần có ít nhất một tài nguyên rảnh trong **mọi** khoảng nó bị chiếm, kể cả lúc chuẩn bị và dọn dẹp (BR-04).
- Đoạn chờ không chiếm nhân viên, nhưng vẫn chiếm ghế, phòng, lồng sấy (BR-05). Không có hai đoạn `hold`/`active` chồng nhau trên cùng một tài nguyên (BR-01).
- Nhân viên có kỹ năng làm dịch vụ (BR-03). Đặt online thì nhân viên phải bật "nhận đặt online". Khách chọn đích danh thì chỉ xét người đó (BR-14).
- Giờ bắt đầu không sớm hơn `now + X` giờ và không xa hơn `now + Y` ngày (BR-06).
- Giữ chỗ đã hết hạn (`expiresAt ≤ now`) coi như không có, kể cả khi job dọn chưa chạy (BR-07).

Phần mở rộng (chuỗi dịch vụ nối tiếp, đặt nhóm) ở [mục 6](#6-mở-rộng-chuỗi-dịch-vụ-và-đặt-nhóm).

## 2. Mô hình

### 2.1. Thời gian

- Lõi dùng **phút tính từ mốc Unix (UTC)**, số nguyên. Đổi sang giờ địa phương chỉ ở rìa: khi dựng giờ mở cửa, ca và lưới giờ, và khi trả kết quả. Cách này vẫn tránh được DST như T-05 muốn. Nó còn tính được ca qua nửa đêm và một yêu cầu trải nhiều ngày ([mục 7](#7-đã-chốt), ý F).
- Mọi khoảng là nửa mở `[start, end)`. Hai khoảng chạm nhau (`[9:00, 9:45)` và `[9:45, 10:30)`) không chồng nhau.
- Trong trang này, giờ viết theo giờ Việt Nam cho dễ đọc.

### 2.2. Dịch vụ: các đoạn theo một gốc

Một biến thể dịch vụ là dãy đoạn liên tiếp tính từ **gốc** `t0` (đầu đoạn đầu tiên). Mỗi đoạn có:

- loại: `prep` (chuẩn bị), `work` (làm) hoặc `wait` (chờ);
- thời lượng;
- tập loại tài nguyên bị chiếm. Đoạn `wait` không được có loại nhân viên.

Ngoài ra, mỗi loại tài nguyên có một thời gian **dọn sau khi dùng** `c_k`. Việc dọn bắt đầu ngay khi đoạn cuối dùng loại đó kết thúc, không chờ cả dịch vụ xong (BR-52). Nhờ vậy bồn tắm được rửa trong lúc bé đang sấy.

Từ đó tính được:

- `prepLen`: tổng thời lượng các đoạn `prep` đứng đầu.
- **Phần khách thấy** `[prepLen, visibleEnd)`, với `visibleEnd` là cuối đoạn `work` cuối cùng. Giờ khách thấy `T = t0 + prepLen`.
- **Mẫu chiếm dụng** của loại `k`: `O_k = normalize(các đoạn dùng k ∪ [lastEnd_k, lastEnd_k + c_k))`. Đây là danh sách khoảng tương đối so với `t0`.

**Ví dụ: Nhuộm ngắn của Tóc Mây** (theo bảng MH-45)

| Đoạn | Loại | Phút từ gốc | Chiếm |
|---|---|---|---|
| Pha thuốc | prep | 0–15 | Thợ |
| Bôi thuốc | work | 15–45 | Thợ, Ghế cắt |
| Chờ lên màu | wait | 45–90 | Ghế cắt |
| Xả thuốc, gội | work | 90–105 | Thợ, Giường gội |
| Sấy, tạo kiểu | work | 105–120 | Thợ, Ghế cắt |
| Dọn ghế | (dọn Ghế cắt 10′) | 120–130 | Ghế cắt |

- `prepLen = 15`, phần khách thấy `[15, 120)`, tức 1 giờ 45.
- `O_Thợ = [0,45) ∪ [90,120)`
- `O_Ghế = [15,90) ∪ [105,130)`
- `O_Gội = [90,105)`

**Ví dụ: Tắm sấy chó từ 10 kg của Pawpaw**

| Đoạn | Loại | Phút từ gốc | Chiếm |
|---|---|---|---|
| Tắm | work | 0–30 | Nhân viên, Bồn tắm |
| Sấy lồng | wait | 30–75 | Lồng sấy |
| Chải, xịt thơm | work | 75–90 | Nhân viên |
| Rửa bồn | (dọn Bồn 10′) | 30–40 | Bồn tắm |
| Dọn lồng | (dọn Lồng 5′) | 75–80 | Lồng sấy |

- `prepLen = 0`, phần khách thấy `[0, 90)`.
- `O_NV = [0,30) ∪ [75,90)`
- `O_Bồn = [0,40)`
- `O_Lồng = [30,80)`

Biến thể nào được dùng thì đã chọn xong trước khi gọi thuật toán: khách tự chọn, hoặc chọn theo thông tin của bé (BR-13).

### 2.3. Tài nguyên: thời gian rảnh

Với mỗi tài nguyên `r`:

- **Khả dụng** `avail_r`:
  - Nhân viên: ca làm trong ngày trừ nghỉ phép.
  - Tài nguyên khác: giờ mở cửa trừ thời gian tạm ngưng (bảo trì).
- **Bận** `busy_r`: các `resourceBooking` của `r` có trạng thái `active`, cộng các `hold` còn hạn (`expiresAt > now`).
- **Rảnh** `free_r = subtract(avail_r, busy_r)`.

Mỗi tài nguyên thuộc đúng một loại. Trong một mục, mỗi loại dùng **đúng một tài nguyên suốt mục đó**: cùng một thợ, cùng một ghế ([mục 7](#7-đã-chốt), ý A).

### 2.4. Phép "vừa" (fit)

Gốc `t` đặt được khoảng tương đối `[a, b)` vào khoảng rảnh `[u, v)` khi `u ≤ t + a` và `t + b ≤ v`, tức `u − a ≤ t ≤ v − b`.

```
erode(free, [a, b)) = ∪ { [u − a, v − b] : [u, v) ∈ free, v − u ≥ b − a }   // tập gốc, đầu cuối tính cả
fit(free, O)        = ∩ { erode(free, x) : x ∈ O }                          // gốc mà mọi khoảng của O đều vừa
```

Tập gốc là khoảng **đóng** hai đầu, khác với khoảng thời gian. Trong code nên biểu diễn bằng nửa mở `[u − a, v − b + 1)` trên phút nguyên, để dùng lại `intersect` và `union` đã có.

## 3. Thuật toán

```
findSlots(req, now):
  v = req.variant
  P = prepLen(v)

  // 1. Giờ mở cửa giới hạn phần khách thấy (BR-02)
  F = fit(openHours(req.branch, req.day), { [P, visibleEnd(v)) })

  // 2. Từng loại tài nguyên, độc lập với nhau
  for k in resourceTypes(v):
    O_k = occupation(v, k)
    R_k = eligible(k, req)             // kỹ năng, nhận đặt online, người khách chọn
    for r in R_k:
      free_r = subtract(avail_r, active_r ∪ { h ∈ holds_r : h.expiresAt > now })
      Fit[r] = fit(free_r, O_k)
    F = intersect(F, union(Fit[r] for r in R_k))
    if F empty: return []

  // 3. Chính sách đặt trước (BR-06), quy về gốc
  F = intersect(F, [now + X − P, now + Y − P])

  // 4. Lưới giờ theo đồng hồ địa phương (bước g, mặc định 15′)
  slots = []
  for T in grid(req.day, g) where T − P ∈ F:
    assign = { k: pick({ r ∈ R_k : T − P ∈ Fit[r] }) for k in resourceTypes(v) }
    slots.push({ start: T, assignment: assign })
  return slots
```

**Vì sao xét từng loại riêng được:** mỗi tài nguyên thuộc một loại, và mỗi loại chỉ dùng một tài nguyên trong mục. Nên chọn ghế không ảnh hưởng tới chọn thợ. Gốc `t` đặt được cả mục khi và chỉ khi mỗi loại có ít nhất một tài nguyên vừa ở `t`. Điều này không còn đúng khi đặt nhiều mục cùng lúc ([mục 6](#6-mở-rộng-chuỗi-dịch-vụ-và-đặt-nhóm)).

**`pick` (phân công "Bất kỳ ai"), đề xuất ([mục 7](#7-đã-chốt), ý E):**
- Nhân viên: chọn cấp thấp nhất trước, vì khách trả giá cấp thấp nhất. Hòa thì chọn người có ít phút bận nhất trong ngày, hòa nữa thì theo thứ tự trong danh sách.
- Tài nguyên khác: theo thứ tự (Ghế 1 trước Ghế 2).

**Độ phức tạp:** mỗi tài nguyên tốn `O(|free_r| · |O_k|)` cho phép vừa. Một ngày có vài chục tài nguyên, mỗi tài nguyên vài chục khoảng rảnh, mẫu chiếm dụng dưới 5 khoảng. Một lần gọi dưới 1 ms, không cần chỉ mục hay bộ nhớ đệm.

**Lễ tân xếp tay:** giờ lệch lưới (09:05) được kiểm bằng chính `Fit[r]`. Lưới chỉ áp cho trang khách.

**Gợi ý giờ gần nhất khi trùng (BT2):** khi lệnh giữ chỗ bị exclusion constraint chặn, gọi lại `findSlots` và trả 3 giờ gần giờ khách chọn nhất.

## 4. Mười ví dụ tính tay

### Bối cảnh A: Salon Tóc Mây, Thứ Bảy 07/11/2026

- Giờ mở cửa 08:00–12:00 và 13:30–20:00. Lưới 15′.
- `now` = 20:00 ngày 06/11, trừ khi ví dụ ghi khác. Đặt trước ít nhất 2 giờ, xa nhất 30 ngày.
- Nhân viên:

  | Thợ | Cấp | Ca | Kỹ năng |
  |---|---|---|---|
  | Mai | Thợ chính | 08:00–17:00 | Cắt, Nhuộm, Gội sấy |
  | Lan | Thợ | 12:00–20:00 | Cắt, Nhuộm, Gội sấy |
  | Hùng | Thợ chính | 08:00–20:00 | Cắt, Gội sấy (không Nhuộm) |

- Tài nguyên khác: Ghế 1, Ghế 2, Giường gội 1, rảnh theo giờ mở cửa.
- Dịch vụ:
  - **Cắt ngắn:** `[0,45)` Thợ + Ghế.
  - **Nhuộm ngắn:** như mục 2.2.
  - **Gội sấy:** `[0,30)` Thợ + Gội.

Các khoảng gốc dưới đây là khoảng đóng (mục 2.4). `T` là giờ khách thấy.

### VD1. Cắt ngắn, "Bất kỳ ai", ngày trống

- Thợ, `O = [0,45)`:
  - Mai `[08:00, 16:15]`, Lan `[12:00, 19:15]`, Hùng `[08:00, 19:15]`.
  - Hợp lại: `[08:00, 19:15]`.
- Ghế (cả hai ghế như nhau): `[08:00, 11:15] ∪ [13:30, 19:15]`.
- Giờ mở cửa cho phần khách thấy: giống Ghế.
- **Kết quả:** 08:00…11:15 (14 giờ) và 13:30…19:15 (24 giờ). Không có giờ nào trong khoảng 11:30–13:15, vì tiệm nghỉ trưa (BR-02).

### VD2. Cắt ngắn, chọn Mai, Mai đã có lịch 09:00–09:45 ở Ghế 1

- Mai rảnh `[08:00, 09:00) ∪ [09:45, 17:00)`. Với `[0,45)`: `[08:00, 08:15] ∪ [09:45, 16:15]`.
- Ghế 2 rảnh cả ngày, nên Ghế không làm mất giờ nào.
- **Kết quả:** 08:00, 08:15, rồi 09:45…11:15, rồi 13:30…16:15 (21 giờ).
- 08:15 hợp lệ vì `[08:15, 09:00)` chỉ chạm lịch 09:00, không chồng. 08:30 thì không: `[08:30, 09:15)` chồng lên lịch 09:00.

### VD3. Nhuộm ngắn, chọn Mai: thợ nhận khách khác trong lúc chờ

Mai có lịch Cắt 09:30–10:15 ở Ghế 2. Mai rảnh `[08:00, 09:30) ∪ [10:15, 17:00)`.

- **Thợ (Mai):**
  - `[0,45)` cho `[08:00, 08:45] ∪ [10:15, 16:15]`.
  - `[90,120)` cho `[06:30, 07:30] ∪ [08:45, 15:00]`.
  - Giao lại: `{08:45} ∪ [10:15, 15:00]`.
- **Ghế (Ghế 1 rảnh cả ngày):**
  - `[15,90)` cho `[07:45, 10:30] ∪ [13:15, 18:30]`.
  - `[105,130)` cho `[06:15, 09:50] ∪ [11:45, 17:50]`.
  - Giao lại: `[07:45, 09:50] ∪ [13:15, 17:50]`.
- **Gội** `[90,105)`: `[06:30, 10:15] ∪ [12:00, 18:15]`.
- **Giờ mở cửa** cho `[15,120)`: `[07:45, 10:00] ∪ [13:15, 18:00]`.
- **Giao tất cả:** gốc `{08:45} ∪ [13:15, 15:00]`. **Kết quả:** 09:00, rồi 13:30…15:15 (9 giờ).

Giải thích: với giờ 09:00, Mai bận 08:45–09:30 (pha, bôi thuốc). Mai rảnh 09:30–10:15 đúng lúc khách chờ lên màu, nên làm được lịch cắt. Mai quay lại 10:15–10:45 để gội và sấy. Lịch cắt phải ngồi Ghế 2, vì Ghế 1 vẫn giữ cho khách nhuộm suốt lúc chờ (BR-05).

Giờ 09:15 thì không được: Mai phải bận 09:00–09:45, chồng lên lịch cắt.

### VD4. Nhuộm ngắn, chọn Mai, ngày trống: đoạn chuẩn bị chặn giờ sớm nhất

- **Thợ (Mai):**
  - `[0,45)` cho `[08:00, 16:15]`.
  - `[90,120)` cho `[06:30, 15:00]`.
  - Giao lại: `[08:00, 15:00]`.
- Giờ mở cửa cho phép gốc từ 07:45, tức khách vào lúc 08:00.
- Nhưng gốc 07:45 cần Mai pha thuốc từ 07:45, trước ca của Mai. Nên giờ sớm nhất là **08:15**.
- Nếu ca Mai bắt đầu 07:45 thì 08:00 hợp lệ: chuẩn bị được phép trước giờ mở cửa, vì khách không có mặt ([mục 7](#7-đã-chốt), ý C).

### VD5. Nhuộm ngắn, chọn Mai, buổi sáng: dọn dẹp phải xong trước giờ đóng cửa

Vẫn là ngày trống như VD4.

- Giờ mở cửa buổi sáng cho phép gốc tới 10:00, tức `T` tới 10:15: khách xong lúc 12:00.
- Ghế phải dọn xong trước 12:00: `t0 + 130 ≤ 12:00`, nên `t0 ≤ 09:50`, tức `T ≤ 10:05`. Trên lưới là **10:00**.
- **Kết quả buổi sáng:** 08:15…10:00 (8 giờ). 10:15 bị loại chỉ vì 10 phút dọn ghế.
- Nếu không có dọn dẹp, 10:15 hợp lệ ([mục 7](#7-đã-chốt), ý B).

### VD6. Nhuộm ngắn, chọn Mai: giường gội là nút thắt

Giường gội 1 đã có lịch Gội sấy 10:00–10:30 (Hùng làm).

- Gội rảnh `[08:00, 10:00) ∪ [10:30, 12:00) ∪ …`. Với `[90,105)` buổi sáng: `[06:30, 08:15] ∪ [09:00, 10:15]`.
- Giao với Thợ `[08:00, 15:00]`, Ghế `[07:45, 09:50]` và giờ mở cửa `[07:45, 10:00]`: gốc `[08:00, 08:15] ∪ [09:00, 09:50]`.
- **Kết quả buổi sáng:** 08:15, 08:30, 09:15, 09:30, 09:45, 10:00.
- So với VD5, mất 08:45 và 09:00: lúc khách cần gội (10:00–10:15, 10:15–10:30), giường đang bận. Thợ và ghế đều rảnh nhưng vẫn không đặt được.

### Bối cảnh B: Spa thú cưng Pawpaw, Thứ Bảy 07/11/2026

- Giờ mở cửa 08:00–18:00. Khoa và Vy làm ca 08:00–18:00, đều có kỹ năng Tắm sấy.
- Tài nguyên: Bồn 1, Bồn 2, Lồng 1, Lồng 2.
- Dịch vụ: Tắm sấy chó từ 10 kg như mục 2.2. Bé Lucky 12 kg, nên hệ thống chọn đúng biến thể này (BR-13).

### VD7. Lồng sấy là nút thắt

Lồng 1 bận 09:30–10:30, Lồng 2 bận 10:00–11:00 (hai bé khác đang sấy). Nhân viên và bồn rảnh.

- **Lồng** `[30,80)`:
  - Lồng 1: `[07:30, 08:10] ∪ [10:00, 16:40]`.
  - Lồng 2: `[07:30, 08:40] ∪ [10:30, 16:40]`.
  - Hợp lại: `[07:30, 08:40] ∪ [10:00, 16:40]`.
- **Nhân viên:** `[08:00, 16:30]`. **Bồn:** `[08:00, 17:20]`. **Giờ mở cửa** cho `[0,90)`: `[08:00, 16:30]`.
- **Kết quả:** 08:00, 08:15, 08:30, rồi 10:00…16:30.
- 08:45…09:45 bị loại dù nhân viên và bồn rảnh. Ví dụ giờ 08:45 cần lồng 09:15–10:05: Lồng 1 bận từ 09:30, Lồng 2 bận từ 10:00.

### VD8. Rửa bồn song song với lúc sấy

Chỉ có Bồn 1, hai lồng rảnh. Bé A tắm lúc 09:00 ở Bồn 1 với Khoa:

- Bồn 1 bận `[09:00, 09:40)`: tắm, rồi rửa bồn.
- Lồng 1 bận `[09:30, 10:20)`.
- Khoa bận `[09:00, 09:30) ∪ [10:15, 10:30)`.

Tính cho bé B:

- **Bồn** `[0,40)`: `[08:00, 08:20] ∪ [09:40, 17:20]`.
- **Lồng 2:** `[07:30, 16:40]`. **Vy:** `[08:00, 16:30]`.
- **Kết quả:** 08:00, 08:15, rồi 09:45…16:30.
- Bé B vào bồn lúc 09:45 trong khi bé A còn đang sấy. Nếu dọn dẹp là đoạn cuối của cả dịch vụ, Bồn 1 sẽ bận tới 10:40 và bé B phải đợi tới 10:45. Đây là lý do tách dọn dẹp theo từng loại tài nguyên (BR-52).

### VD9. Đặt trước tối thiểu và giữ chỗ hết hạn (bối cảnh A)

`now` = 10:20 ngày 07/11. Khách đặt Cắt ngắn, "Bất kỳ ai".

- Lịch thật: Mai + Ghế 2, 13:30–14:15.
- Giữ chỗ H1: Lan + Ghế 1, 13:30–14:15, hết hạn 10:25. Còn hạn, nên tính là bận.
- Giữ chỗ H2: Hùng + Ghế 1, 14:15–15:00, hết hạn 10:10. Đã hết hạn, nên bỏ qua dù job dọn chưa chạy (BR-07).

Tính:

- Đặt trước ít nhất 2 giờ: `T ≥ 12:20`. Buổi sáng không còn giờ, chiều mở 13:30.
- Ghế 1 bận 13:30–14:15 (H1), Ghế 2 bận 13:30–14:15. Nên 13:30, 13:45, 14:00 hết ghế.
- **Kết quả:** 14:15…19:15. Ở 14:15 hệ thống gán Ghế 1 (H2 không còn), thợ theo `pick`.
- Nếu khách mở trang lúc 10:26, H1 đã hết hạn và 13:30 hiện lại với Ghế 1.

### VD10. "Bất kỳ ai", kỹ năng và giá theo cấp (bối cảnh A)

Khách đặt Nhuộm ngắn, "Bất kỳ ai". Mai kín lịch 13:30–17:00. Lan và Hùng rảnh cả ngày.

- `R_Thợ = {Mai, Lan}`. Hùng không có kỹ năng Nhuộm nên không được xét, dù rảnh (BR-03).
- Bước chọn thợ của khách (BR-14): "Bất kỳ ai" đứng đầu, rồi Mai (sớm nhất 08:15) và Lan (sớm nhất 13:30). Hùng không hiện.
- **Giờ 09:00:** chỉ Mai vừa, vì Lan vào ca 12:00. Gán Mai.
- **Giờ 14:00:** chỉ Lan vừa. Gán Lan. Gốc 13:45 cần Lan `[13:45, 14:30) ∪ [15:15, 15:45)`.
- **Giá:** cả hai giờ đều 500.000 ₫, là giá cấp thấp nhất làm được (Lan, cấp Thợ). Khách được gán Mai lúc 09:00 vẫn trả 500.000 ₫. Nếu khách chọn đích danh Mai thì trả 550.000 ₫.

## 5. Đối chứng vét cạn cho E1

Thuật toán đối chứng không dùng phép vừa. Nó kiểm từng phút, nên khác hẳn về cách làm:

```
bruteSlots(req, now):
  for T in grid(req.day, g):
    t0 = T − prepLen(v)
    if not inPolicy(T, now): continue
    if not everyMinuteIn([T, T + visibleLen), openHours): continue
    ok = true
    for k in resourceTypes(v):
      ok = ok and exists r in R_k:
             for every minute m in O_k shifted by t0:
               m in avail_r and m not in any busy interval of r
    if ok: yield T
```

- **Thuộc tính kiểm (fast-check, 10.000 kịch bản):** `findSlots` và `bruteSlots` trả cùng một tập giờ.
- Với mỗi giờ, phương án gán của `findSlots` dùng toàn tài nguyên đúng loại, có kỹ năng, và rảnh ở mọi phút.
- Bộ sinh ngẫu nhiên tạo:
  - giờ mở cửa 1–3 khung, có ngày đặc biệt;
  - ca;
  - lịch đã có;
  - giữ chỗ còn và hết hạn;
  - dịch vụ có 1–5 đoạn, có chờ, chuẩn bị, dọn;
  - 1–4 tài nguyên mỗi loại.

  Dịch vụ mẫu của cả hai ngành luôn được đưa vào.
- **Thuộc tính phụ:**
  - Thêm một lịch bận thì tập giờ chỉ nhỏ đi, không lớn thêm.
  - Bỏ một giữ chỗ hết hạn khỏi đầu vào thì kết quả không đổi.

Mười ví dụ ở mục 4 đã được kiểm lại bằng một bản vét cạn viết riêng (08/11). Chúng thành mười test cụ thể, đặt tên theo quy tắc: `it('BR-05: đoạn chờ cho thợ nhận khách khác (VD3)', ...)`.

## 6. Mở rộng: chuỗi dịch vụ và đặt nhóm

Khi một lịch có nhiều mục, các loại tài nguyên không còn độc lập, vì một thợ có thể làm hai mục. Hướng giải cho giai đoạn 3:

- **Chuỗi nối tiếp** (cắt rồi nhuộm):
  - Mục sau bắt đầu khi phần khách thấy của mục trước kết thúc.
  - Duyệt quay lui theo mục. Mỗi lần chọn tài nguyên cho một mục thì trừ phần chiếm dụng đó khỏi `free` rồi mới tính mục sau.
  - Đoạn chuẩn bị của mục sau có thể chồng lên cuối mục trước nếu khác người làm.
- **Đặt nhóm** (hai bé cùng giờ):
  - Các mục cùng giờ bắt đầu, mỗi loại cần các tài nguyên **khác nhau**.
  - Đây là bài toán ghép cặp nhỏ (mỗi lịch không quá 4 mục). Quay lui là đủ.

Đối chứng vét cạn vẫn dùng được, nhưng phải thử mọi tổ hợp gán.

## 7. Đã chốt

- **A.** Một mục dùng cùng một tài nguyên cho mỗi loại từ đầu đến cuối (BR-53).
- **B.** Tài nguyên không phải nhân viên chỉ dùng trong giờ mở cửa, nên dọn dẹp cũng phải xong trước giờ đóng (BR-54, VD5).
- **C.** Chuẩn bị chỉ cần nhân viên có ca, được phép trước giờ mở cửa (BR-54, VD4).
- **D.** Lưới giờ 15′ theo đồng hồ địa phương, cấu hình theo chi nhánh; lễ tân xếp tay được giờ lệch lưới (BR-58).
- **E.** Phân công "Bất kỳ ai": cấp thấp nhất trước, rồi ít phút bận nhất trong ngày, rồi theo thứ tự danh sách (BR-57).
- **F.** Thời gian trong lõi là phút từ mốc Unix (UTC) ([T-05](./quyet-dinh-ky-thuat.md#t-05-packagesscheduling-core-thuật-toán-thuần)).
