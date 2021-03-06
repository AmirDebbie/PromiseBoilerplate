const states = {
  pending: 'Pending',
  resolved: 'Resolved',
  rejected: 'Rejected'
};

// class Declare {
//   constructor(CB) {
//     this.state = states.pending;
//     this.value = null;
//     CB(this.resolve.bind(this))
//   }

//   resolve(value) {
//     this.state = states.resolved;
//     this.value = value;
//   }

//   then(callback) {
//     return new Declare(resolve => resolve(this.value));
//   }
// }



class Declare {
  constructor(executor) {
      const tryCall = callback => Declare.try(() => callback(this.value));
      const laterCalls = [];
      const callLater = getMember => callback => new Declare(resolve => laterCalls.push(() => resolve(getMember()(callback))));
      const members = {
          [states.resolved]: {
              state: states.resolved,
              then: tryCall,
              catch: _ => this
          },
          [states.rejected]: {
              state: states.rejected,
              then: _ => this,
              catch: tryCall
          },
          [states.pending]: {
              state: states.pending,
              then: callLater(() => this.then),
              catch: callLater(() => this.catch)
          }
      };
      const changeState = state => Object.assign(this, members[state]);
      const apply = (value, state) => {
          if (this.state === states.pending) {
              this.value = value;
              changeState(state);
              for (const laterCall of laterCalls) {
                  laterCall();
              }
          }
      };

      const getCallback = state => value => {
          if (value instanceof Declare && state === states.resolved) {
              value.then(value => apply(value, states.resolved));
              value.catch(value => apply(value, states.rejected));
          } else {
              apply(value, state);
          }
      };

      const resolve = getCallback(states.resolved);
      const reject = getCallback(states.rejected);
      changeState(states.pending);
      try {
          executor(resolve, reject);
      } catch (error) {
          reject(error);
      }
  }

  static resolve(value) {
      return new Declare(resolve => resolve(value));
  }

  static reject(value) {
      return new Declare((_, reject) => reject(value));
  }

  static try(callback) {
      return new Declare(resolve => resolve(callback()));
  }
}

module.exports = Declare;