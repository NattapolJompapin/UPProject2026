import React, { useState, useEffect } from "react";
import ChartistGraph from "react-chartist";
import { Card, Container, Row, Col, Form, Alert, Button } from "react-bootstrap";
import "chartist/dist/chartist.min.css";

/* ===================== STYLE (Original Theme + Mobile Fixes) ===================== */
const themeStyle = `
  .chart-scroll { overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }
  
  .history-header {
    background: linear-gradient(87deg, #5e72e4 0, #825ee4 100%) !important;
    border-radius: 8px 8px 0 0 !important;
    padding: 20px !important;
  }
  
  .history-header .card-title { 
    color: white !important; 
    margin: 0 !important; 
    font-weight: bold; 
    font-size: 1.25rem; 
  }
  
  .form-select { 
    border-radius: 12px !important; 
    padding: 8px 15px !important; 
    border: 1px solid #e9ecef !important; 
    font-size: 14px !important; 
    color: #525f7f !important; 
  }
  
  .form-label { 
    font-weight: 700; 
    color: #5e72e4; 
    text-transform: uppercase; 
    font-size: 0.75rem; 
    margin-bottom: 8px; 
  }
  
  .card { 
    border: none !important; 
    box-shadow: 0 0 2rem 0 rgba(136, 152, 170, 0.15) !important; 
    margin-bottom: 30px !important; 
    border-radius: 0.75rem !important; 
  }
  
  .ct-bar { cursor: pointer; transition: opacity 0.2s; }
  .ct-bar:hover { opacity: 0.7; }
  
  .legend-dot { 
    width: 12px; height: 12px; 
    border-radius: 50%; 
    display: inline-block; 
    margin-right: 5px; 
  }
  
  .no-data-card { 
    border: 2px dashed #e9ecef !important; 
    background-color: #f8f9fe !important; 
  }

  /* ดันข้อความแกน X ลงมาไม่ให้ทับเส้นกราฟ */
  .ct-label.ct-horizontal {
    padding-top: 10px !important;
  }
`;

const CAMERA_MAP = { CAM01: "วิศวะ", CAM02: "วิทยาศาสตร์", CAM03: "ศิลปศาสตร์", CAM04: "PKY" };

function History() {
  const currentYearBE = new Date().getFullYear() + 543;
  const [selectedDay, setSelectedDay] = useState(new Date().getDate().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, "0"));
  const [selectedYearBE, setSelectedYearBE] = useState(currentYearBE.toString());
  const [cameraId, setCameraId] = useState("CAM01");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("22:00");

  const [rawFileData, setRawFileData] = useState({ labels: [], series: [[]] });
  const [chartState, setChartState] = useState({ labels: [], series: [[]] });
  const [detailChart, setDetailChart] = useState(null); 
  const [selectedHour, setSelectedHour] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const monthsThai = [
    { val: "01", name: "มกราคม" }, { val: "02", name: "กุมภาพันธ์" }, { val: "03", name: "มีนาคม" },
    { val: "04", name: "เมษายน" }, { val: "05", name: "พฤษภาคม" }, { val: "06", name: "มิถุนายน" },
    { val: "07", name: "กรกฎาคม" }, { val: "08", name: "สิงหาคม" }, { val: "09", name: "กันยายน" },
    { val: "10", name: "ตุลาคม" }, { val: "11", name: "พฤศจิกายน" }, { val: "12", name: "ธันวาคม" },
  ];

  const timeOptions = Array.from({ length: 16 }, (_, i) => {
    const hour = (i + 7).toString().padStart(2, "0") + ":00";
    return <option key={hour} value={hour}>{hour}</option>;
  });

  const handleSearch = async () => {
    setIsLoaded(false);
    setDetailChart(null);
    const yearCE = parseInt(selectedYearBE) - 543;
    const formattedDate = `${yearCE}-${selectedMonth}-${selectedDay.padStart(2, "0")}`;
    
    try {
      const res = await fetch(`http://localhost:3001/api/history?cameraId=${cameraId}&date=${formattedDate}&startTime=${startTime}&endTime=${endTime}`);
      const result = await res.json();

      if (result && result.labels && result.labels.length > 0) {
        setRawFileData(result);
        const bucket = {};
        result.labels.forEach((label, idx) => {
          const hour = label.split(":")[0].padStart(2, '0') + ":00";
          if (!bucket[hour]) bucket[hour] = { sum: 0, count: 0 };
          bucket[hour].sum += result.series[0][idx];
          bucket[hour].count += 1;
        });

        const labels = [], series = [];
        const startH = parseInt(startTime.split(":")[0]);
        const endH = parseInt(endTime.split(":")[0]);

        for (let i = startH; i <= endH; i++) {
          const h = i.toString().padStart(2, '0') + ":00";
          labels.push(h);
          series.push(bucket[h] ? Math.round(bucket[h].sum / bucket[h].count) : 0);
        }
        setChartState({ labels, series: [series] });
      } else {
        setChartState({ labels: [], series: [[]] });
        setRawFileData({ labels: [], series: [[]] });
      }
    } catch (err) { 
        console.error("Fetch error:", err);
        setChartState({ labels: [], series: [[]] });
    } finally { setIsLoaded(true); }
  };

  useEffect(() => { handleSearch(); }, [selectedDay, selectedMonth, selectedYearBE, cameraId, startTime, endTime]);

  const getDensityColor = (val) => {
    if (val >= 41) return "#f5365c"; // แดง
    if (val >= 31) return "#fb6340"; // ส้ม
    if (val >= 21) return "#ffd600"; // เหลือง
    return "#2dce89"; // เขียว
  };

  // Listener สำหรับกราฟแท่ง (Bar Chart)
  const chartEvents = {
    draw: (data) => {
      if (data.type === "bar") {
        data.element.attr({ style: `stroke: ${getDensityColor(data.value.y)}; stroke-width: 25px;` }); 
        data.group.elem("text", { 
          x: data.x2, y: data.y2 - 15, 
          style: "font-size:12px; font-weight:bold; text-anchor:middle; fill:#525f7f;" 
        }).text(data.value.y);
      }
    },
    created: (context) => {
      if (!context.svg) return;
      context.svg._node.onclick = (e) => {
        const bar = e.target.closest('.ct-bar');
        if (!bar) return;
        const seriesGroup = bar.parentNode;
        const allBars = Array.from(seriesGroup.querySelectorAll('.ct-bar'));
        const index = allBars.indexOf(bar);
        if (index !== -1 && chartState.labels[index]) {
          const hourLabel = chartState.labels[index];

          const minuteBucket = {};

          rawFileData.labels.forEach((l, i) => {

            if (l.startsWith(hourLabel.split(":")[0])) {

              // เอาแค่ HH:MM
              const minute = l.substring(0,5);

              if (!minuteBucket[minute]) {
                minuteBucket[minute] = { sum: 0, count: 0 };
              }

              minuteBucket[minute].sum += rawFileData.series[0][i];
              minuteBucket[minute].count += 1;
            }

          });

          const dLabels = [];
          const dSeries = [];

          Object.keys(minuteBucket)
            .sort()
            .forEach(min => {

              dLabels.push(min);

              dSeries.push(
                Math.round(
                  minuteBucket[min].sum /
                  minuteBucket[min].count
                )
              );

            });
          if (dLabels.length > 0) {
            setSelectedHour(hourLabel);
            setDetailChart({ labels: dLabels, series: [dSeries] });
          }
        }
      };
    }
  };

  // Listener ใหม่สำหรับกราฟเส้น (Line Chart รายนาที) เพื่อโชว์ตัวเลขและเปลี่ยนสี
  const lineChartEvents = {
    draw: (data) => {
      // 1. เปลี่ยนเส้นกราฟเป็นสีเทา
      if (data.type === "line") {
        data.element.attr({
          style: "stroke: #ced4da; stroke-width: 3px;" // สีเทากลางๆ
        });
      } 
      // 2. เปลี่ยนสีพื้นที่ใต้กราฟเป็นสีเทาอ่อน
      else if (data.type === "area") {
        data.element.attr({
          style: "fill: #e9ecef; fill-opacity: 0.5;" // สีเทาอ่อนโปร่งแสง
        });
      }
      // 3. กำหนดสีจุดและขยายตัวอักษร
      else if (data.type === "point") {
        const pointColor = getDensityColor(data.value.y);
        
        // ขยายขนาดจุดให้เห็นชัดขึ้นรับกับตัวเลข
        data.element.attr({
          style: `stroke: ${pointColor}; stroke-width: 12px;` 
        });

        // ขยาย font-size เป็น 14px และดันขึ้นไปเพิ่มอีกนิดเพื่อไม่ให้ทับจุด
        data.group.elem("text", {
          x: data.x,
          y: data.y - 18, 
          style: `font-size: 14px; font-weight: bold; text-anchor: middle; fill: ${pointColor};` 
        }).text(data.value.y);
      }
    }
  };

  return (
    <Container fluid className="py-4">
      <style>{themeStyle}</style>
      
      {/* --- ส่วนค้นหาข้อมูล --- */}
      <Row>
        <Col md="12">
          <Card>
            <Card.Header className="history-header">
              <Card.Title as="h4">ข้อมูลย้อนหลัง</Card.Title>
            </Card.Header>
            <Card.Body className="px-4 py-4">
              <Row className="align-items-end g-3">
                <Col md="3">
                  <Form.Group>
                    <Form.Label className="form-label">เลือกสถานที่</Form.Label>
                    <Form.Select value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
                      {Object.entries(CAMERA_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md="5">
                  <Form.Group>
                    <Form.Label className="form-label">เลือกวันที่</Form.Label>
                    <div className="d-flex flex-wrap gap-2">
                      <Form.Select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} style={{ flex: '1 1 auto', minWidth: '70px' }}>
                        {Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
                      </Form.Select>
                      <Form.Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ flex: '1 1 auto', minWidth: '120px' }}>
                        {monthsThai.map(m=><option key={m.val} value={m.val}>{m.name}</option>)}
                      </Form.Select>
                      <Form.Select value={selectedYearBE} onChange={(e) => setSelectedYearBE(e.target.value)} style={{ flex: '1 1 auto', minWidth: '80px' }}>
                        <option value={currentYearBE}>{currentYearBE}</option><option value={currentYearBE-1}>{currentYearBE-1}</option>
                      </Form.Select>
                    </div>
                  </Form.Group>
                </Col>

                <Col md="4">
                  <Form.Group>
                    <Form.Label className="form-label">ช่วงเวลา</Form.Label>
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <Form.Select value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ flex: '1 1 auto' }}>
                        {timeOptions}
                      </Form.Select>
                      <span className="text-muted fw-bold">ถึง</span>
                      <Form.Select value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ flex: '1 1 auto' }}>
                        {timeOptions}
                      </Form.Select>
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* --- ส่วนแสดงผลกราฟหลัก --- */}
      {isLoaded && chartState.labels.length > 0 ? (
        <Row>
          <Col md="12">
            <Card>
              <Card.Body className="px-4 pt-4">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <h5 className="mb-0 text-primary font-weight-bold">กราฟสถิติ: {CAMERA_MAP[cameraId]}</h5>
                  <div className="d-flex gap-3 flex-wrap">
                    <div className="small"><span className="legend-dot" style={{background:'#2dce89'}}></span> 0-20</div>
                    <div className="small"><span className="legend-dot" style={{background:'#ffd600'}}></span> 21-30</div>
                    <div className="small"><span className="legend-dot" style={{background:'#fb6340'}}></span> 31-40</div>
                    <div className="small"><span className="legend-dot" style={{background:'#f5365c'}}></span> 41+</div>
                  </div>
                </div>
                
                <div className="chart-scroll">
                  <div style={{ 
                    width: chartState.labels.length <= 6 ? Math.max(chartState.labels.length * 100, 300) + "px" : "100%", 
                    minWidth: chartState.labels.length <= 6 ? "auto" : "800px", 
                    height: "400px",
                    margin: "0 auto" 
                  }}>
                    <ChartistGraph 
                      data={chartState} 
                      type="Bar" 
                      options={{ 
                          low: 0, 
                          fullWidth: true, 
                          chartPadding: { top: 40, right: 20, bottom: 10, left: 10 }, 
                          axisX: { offset: 40 },
                          axisY: { onlyInteger: true } 
                      }} 
                      listener={chartEvents} 
                    />
                  </div>
                </div>
                <p className="text-center text-muted small mt-3">💡 จิ้มที่แท่งกราฟเพื่อดูรายละเอียดระดับรายนาที</p>
              </Card.Body>
            </Card>

            {/* --- ส่วนกราฟรายละเอียด --- */}
            {detailChart && (
              <Card className="border-primary mt-3" style={{borderWidth:'2px', borderStyle:'solid'}}>
                <Card.Header className="bg-light d-flex justify-content-between align-items-center py-3">
                  <h5 className="mb-0 font-weight-bold text-primary">🔍 รายละเอียดรายนาที {selectedHour} น.</h5>
                  <Button variant="outline-danger" size="sm" onClick={() => setDetailChart(null)}>ปิด</Button>
                </Card.Header>
                <Card.Body>
                  <div className="chart-scroll">
                    {/* ปรับ minWidth เป็น 2000px เพื่อให้กราฟขยายออกในมือถือ */}
                    <div style={{ width: "100%", minWidth: "2000px", height: "350px" }}>
                      <ChartistGraph 
                        data={detailChart} 
                        type="Line" 
                        options={{ 
                            low: 0, 
                            showArea: true, 
                            fullWidth: true,
                            chartPadding: { top: 45, right: 20, bottom: 10, left: 10 },
                            axisX: { labelInterpolationFnc: (value, index) => index % 5 === 0 ? value : null, offset: 50 },
                            axisY: { onlyInteger: true } 
                        }} 
                        listener={lineChartEvents}
                      />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      ) : (
        isLoaded && (
          <Row>
            <Col md="12">
              <Card className="no-data-card py-5 text-center">
                <Card.Body>
                  <div className="mb-3"><span style={{ fontSize: "50px" }}>📁</span></div>
                  <h3 className="text-muted font-weight-bold">ไม่พบข้อมูลสถิติ</h3>
                  <p className="text-muted mb-0">ไม่พบข้อมูลในช่วงเวลา {startTime} ถึง {endTime}</p>
                  <Alert variant="info" className="d-inline-block mt-3 px-4 shadow-sm">
                    ในวันที่ <b>{selectedDay} {monthsThai.find(m => m.val === selectedMonth)?.name} {selectedYearBE}</b>
                  </Alert>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )
      )}
    </Container>
  );
}

export default History;