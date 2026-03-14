import { Router } from 'express';
import { setupSSE } from '../services/events-service';

const router: Router = Router();

/**
 * GET /api/events - SSE 事件推送
 */
router.get('/', setupSSE);

export default router;
