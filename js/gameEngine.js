/**
 * gameEngine.js
 * Fruit Catcher 게임의 핵심 로직 (낙하물, 충돌, 점수 등)
 */

class GameEngine {
  constructor() {
    // 게임 상태
    this.score = 0;
    this.level = 1;
    this.timeLimit = 60;
    this.isGameActive = false;

    // 게임 루프 & 타이머
    this.gameTimer = null;
    this.loopId = null;
    this.spawnTimer = null;

    // 게임 오브젝트
    this.basketPosition = 1; // 0: Left, 1: Center, 2: Right
    this.items = []; // 현재 떨어지고 있는 아이템들

    // 설정 상수
    this.LANES = [0, 1, 2]; // 3개의 레일
    this.LANE_COUNT = 3;

    // 아이템 타입 정의
    this.ITEM_TYPES = [
      { type: 'apple', icon: '🍎', score: 100, speed: 2, weight: 60 },
      { type: 'orange', icon: '🍊', score: 200, speed: 3, weight: 30 },
      { type: 'bomb', icon: '💣', score: -500, speed: 4, weight: 10 }
    ];

    this.baseSpeed = 1.0; // 레벨에 따른 속도 계수
  }

  /**
   * 게임 시작
   */
  start() {
    if (this.isGameActive) return;

    this.isGameActive = true;
    this.score = 0;
    this.level = 1;
    this.timeLimit = 60;
    this.items = [];
    this.basketPosition = 1; // Center에서 시작
    this.baseSpeed = 1.0;

    // UI 초기화
    this.updateHUD();
    this.clearItemsFromDOM();
    this.updateBasketPosition();

    // 타이머 시작 (1초마다 감소)
    this.gameTimer = setInterval(() => {
      this.timeLimit--;
      this.updateHUD();

      if (this.timeLimit <= 0) {
        this.gameOver();
      }
    }, 1000);

    // 아이템 생성 타이머 시작
    this.startSpawning();

    // 게임 루프 시작 (60fps)
    this.loop();

    console.log("Game Started: Fruit Catcher");
  }

  /**
   * 게임 종료
   */
  stop() {
    this.isGameActive = false;

    // 타이머 정리
    if (this.gameTimer) clearInterval(this.gameTimer);
    if (this.spawnTimer) clearTimeout(this.spawnTimer);
    if (this.loopId) cancelAnimationFrame(this.loopId);

    this.gameTimer = null;
    this.spawnTimer = null;
    this.loopId = null;
  }

  gameOver() {
    this.stop();
    alert(`게임 종료!\n최종 점수: ${this.score}\n최종 레벨: ${this.level}`);
  }

  /**
   * 메인 게임 루프 (애니메이션 & 충돌 감지)
   */
  loop() {
    if (!this.isGameActive) return;

    this.updateItems();
    this.loopId = requestAnimationFrame(() => this.loop());
  }

  /**
   * 아이템 위치 업데이트 및 충돌 검사
   */
  updateItems() {
    const containerHeight = document.getElementById('game-overlay').clientHeight;
    const basketY = containerHeight - 80; // 바구니 윗부분 대략적인 위치 (바닥에서 60px가 바구니 높이)

    let itemRemoved = false;

    // 아이템 이동 및 제거를 위해 역순 순회
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      // 1. 위치 이동 (기본 속도 * 레벨 보정)
      item.y += item.speed * this.baseSpeed;
      item.element.style.top = `${item.y}px`;

      // 2. 충돌 감지 (바구니와 Y좌표 겹침 & 같은 레일)
      if (item.y >= basketY && item.y < basketY + 20 && item.lane === this.basketPosition) {
        this.handleCollision(item, i);
        itemRemoved = true;
        continue;
      }

      // 3. 바닥에 닿으면 제거
      if (item.y > containerHeight) {
        item.element.remove();
        this.items.splice(i, 1);
        itemRemoved = true;
      }
    }

    // 아이템이 제거되었고 화면에 남은 아이템이 없다면 다음 아이템 생성 예약
    if (itemRemoved && this.items.length === 0) {
      this.scheduleNextSpawn();
    }
  }

  /**
   * 충돌 처리
   */
  handleCollision(item, index) {
    // 점수 적용
    this.score += item.score;

    // 효과 (간단히 콘솔로 대체, 추후 사운드 추가 가능)
    if (item.score > 0) {
      // Good item
      console.log(`Catch! ${item.type} (+${item.score})`);
    } else {
      // Bad item
      console.log(`Boom! ${item.type} (${item.score})`);
    }

    // 레벨업 체크
    this.checkLevelUp();

    // UI 업데이트
    this.updateHUD();

    // 아이템 제거
    item.element.remove();
    this.items.splice(index, 1);
  }

  /**
   * 아이템 생성 시작
   */
  startSpawning() {
    this.spawnItem();
  }

  /**
   * 다음 아이템 생성 예약
   */
  scheduleNextSpawn() {
    if (!this.isGameActive) return;

    // 약간의 딜레이 후 생성 (0.5초 ~ 1.0초 랜덤)
    const delay = 500 + Math.random() * 500;
    this.spawnTimer = setTimeout(() => {
      if (this.items.length === 0) { // 중복 생성 방지
        this.spawnItem();
      }
    }, delay);
  }

  spawnItem() {
    if (!this.isGameActive) return;

    // 1. 랜덤 레일 선택 (0, 1, 2)
    const lane = Math.floor(Math.random() * this.LANE_COUNT);

    // 2. 랜덤 아이템 타입 선택 (가중치 기반)
    const rand = Math.random() * 100;
    let selectedType = this.ITEM_TYPES[0];
    let acc = 0;

    for (const type of this.ITEM_TYPES) {
      acc += type.weight;
      if (rand < acc) {
        selectedType = type;
        break;
      }
    }

    // 3. DOM 요소 생성
    const element = document.createElement('div');
    element.className = 'item';
    element.innerHTML = selectedType.icon;
    element.style.left = `${(lane * 33.33) + 11}%`; // 레일 중앙에 위치 (33% 너비의 절반인 16.5% 근처, CSS 보정 감안 11% 정도)
    element.style.top = '0px';

    document.getElementById('item-container').appendChild(element);

    // 4. 아이템 리스트에 추가
    this.items.push({
      element: element,
      lane: lane,
      y: 0,
      type: selectedType.type,
      score: selectedType.score,
      speed: selectedType.speed + (Math.random() * 1) // 약간의 속도 랜덤성
    });
  }

  /**
   * 포즈 감지 시 호출됨 (poseEngine.js에서 호출)
   */
  onPoseDetected(poseLabel) {
    if (!this.isGameActive) return;

    // 포즈 라벨에 따라 바구니 위치 변경
    // 라벨: "Left", "Center", "Right" (GAME_RULE.md 및 모델 기준)

    let newLane = this.basketPosition;

    if (poseLabel === "Left") {
      newLane = 0;
    } else if (poseLabel === "Right") {
      newLane = 2;
    } else if (poseLabel === "Center") {
      newLane = 1;
    }

    if (newLane !== this.basketPosition) {
      this.basketPosition = newLane;
      this.updateBasketPosition();
    }
  }

  /**
   * 바구니 위치 UI 업데이트
   */
  updateBasketPosition() {
    const basket = document.getElementById('basket');
    // 레일 중앙 위치: 16.66%, 50%, 83.33%
    // 단, CSS에서 basket의 left는 50%가 lane의 중앙이므로, lane 자체의 left 값인 0, 33.3, 66.6에다가...
    // 좀 더 단순히: Lane 0 => 16.6%, Lane 1 => 50%, Lane 2 => 83.3%

    const positions = ['16.66%', '50%', '83.33%'];
    basket.style.left = positions[this.basketPosition];
  }

  updateHUD() {
    document.getElementById('score').innerText = this.score;
    document.getElementById('timer').innerText = this.timeLimit;
    document.getElementById('level').innerText = this.level;
  }

  checkLevelUp() {
    // 1000점마다 레벨업
    const newLevel = Math.floor(this.score / 1000) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.baseSpeed += 0.2; // 속도 증가
      console.log(`Level Up! Lv.${this.level}`);

      // 아이템 속도 일괄 증가
      // this.items.forEach(item => item.speed += 0.5); 
    }
  }

  clearItemsFromDOM() {
    const container = document.getElementById('item-container');
    container.innerHTML = '';
    this.items = [];
  }
}

// 전역 인스턴스
window.GameEngine = GameEngine;
